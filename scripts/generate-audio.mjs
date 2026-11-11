#!/usr/bin/env node
// Baked-audio generator — run LOCALLY BY THE OWNER only. NEVER in CI.
//   GOOGLE_TTS_KEY=... node scripts/generate-audio.mjs <slug> [--lang id,en]
//   ELEVENLABS_KEY=... node scripts/generate-audio.mjs <slug> [--provider elevenlabs] [--voice <id>]
//
// For every scene narration it writes stories/<slug>/audio/<lang>/<scene>.mp3
// and records per-language caption timing windows into story.json
// (scene.audio.mode becomes "baked"). Keys come ONLY from the shell
// environment — they never enter the repo, config files, or logs, and they
// are sent as request HEADERS (x-goog-api-key / xi-api-key), never URL
// query params: keys in URLs land in proxy/server logs. Caption
// timings are exact when ffprobe is installed, word-count estimates otherwise;
// the validator checks baked-audio ↔ caption consistency.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

function parseArgs(argv) {
  const positional = []
  const options = { lang: 'id,en', provider: 'google' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--lang') options.lang = argv[++i]
    else if (argv[i] === '--provider') options.provider = argv[++i]
    else if (argv[i] === '--voice') options.voice = argv[++i]
    else positional.push(argv[i])
  }
  return { slug: positional[0], options }
}

const { slug, options } = parseArgs(process.argv.slice(2))
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: node scripts/generate-audio.mjs <slug> [--provider google|elevenlabs] [--lang id,en] [--voice <id>]')
  process.exit(1)
}

const storyPath = join(rootDir, 'stories', slug, 'story.json')
if (!existsSync(storyPath)) {
  console.error(`stories/${slug}/story.json not found.`)
  process.exit(1)
}

const provider = options.provider
if (provider !== 'google' && provider !== 'elevenlabs') {
  console.error('--provider must be "google" or "elevenlabs" (the browser voice cannot be baked).')
  process.exit(1)
}
const apiKey = provider === 'google' ? process.env.GOOGLE_TTS_KEY : process.env.ELEVENLABS_KEY
if (!apiKey) {
  console.error(
    `Missing ${provider === 'google' ? 'GOOGLE_TTS_KEY' : 'ELEVENLABS_KEY'} in the environment. Keys come from the shell ONLY — never from files.`,
  )
  process.exit(1)
}

const langs = options.lang
  .split(',')
  .map((lang) => lang.trim())
  .filter((lang) => lang === 'id' || lang === 'en')
if (langs.length === 0) {
  console.error('--lang must be a comma list of id/en (e.g. --lang id,en).')
  process.exit(1)
}

const story = JSON.parse(readFileSync(storyPath, 'utf8'))
const audioRoot = join(rootDir, 'stories', slug, 'audio')
mkdirSync(join(audioRoot, 'id'), { recursive: true })
mkdirSync(join(audioRoot, 'en'), { recursive: true })

async function synthesizeGoogle(text, lang) {
  // A1 ruling: keys never ride URLs (they land in proxy/server logs) — the
  // key goes in the x-goog-api-key header, matching ElevenLabs' header pattern.
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: lang === 'id' ? 'id-ID' : 'en-US',
        name: options.voice ?? (lang === 'id' ? 'id-ID-Chirp3-HD-Aoede' : 'en-US-Chirp3-HD-Aoede'),
      },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 },
    }),
  })
  const json = await response.json()
  if (!response.ok || !json.audioContent) {
    throw new Error(`Google TTS: ${json.error?.message ?? response.status}`)
  }
  return Buffer.from(json.audioContent, 'base64')
}

async function synthesizeElevenLabs(text) {
  const voiceId = options.voice ?? '21m00Tcm4TlvDq8ikWAM'
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 },
      }),
    },
  )
  if (!response.ok) throw new Error(`ElevenLabs: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const scratchPath = join(audioRoot, '.duration-check.mp3')
let ffprobeAvailable = false
try {
  execFileSync('ffprobe', ['-version'], { stdio: 'ignore' })
  ffprobeAvailable = true
} catch {
  console.warn('warn  ffprobe not found — caption timings will be word-count estimates.')
}

/** Exact duration via ffprobe when available; word-count estimate otherwise. */
function measureDuration(buffer, text) {
  if (ffprobeAvailable) {
    try {
      writeFileSync(scratchPath, buffer)
      const out = execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', scratchPath],
        { encoding: 'utf8' },
      )
      const duration = Number(JSON.parse(out)?.format?.duration)
      if (Number.isFinite(duration) && duration > 0) return duration
    } catch {
      // fall through to the estimate
    } finally {
      rmSync(scratchPath, { force: true })
    }
  }
  const words = text.split(/\s+/).length
  return Math.max(1.2, words * 0.42 + 0.9) // slow toddler pacing estimate
}

for (const lang of langs) {
  for (const scene of story.scenes) {
    const text = scene.narration[lang]
    const buffer = provider === 'google' ? await synthesizeGoogle(text, lang) : await synthesizeElevenLabs(text)
    writeFileSync(join(audioRoot, lang, `${scene.id}.mp3`), buffer)
    const duration = measureDuration(buffer, text)
    const audio = scene.audio ?? { mode: 'tts', captions: [] }
    audio.mode = 'baked'
    audio.captions = audio.captions.filter((caption) => !(caption.line === scene.id && caption.lang === lang))
    audio.captions.push({ line: scene.id, lang, tStart: 0, tEnd: Number(duration.toFixed(2)) })
    scene.audio = audio
    console.log(`  ok  audio/${lang}/${scene.id}.mp3 (${duration.toFixed(2)}s)`)
  }
}

writeFileSync(storyPath, `${JSON.stringify(story, null, 2)}\n`)

console.log(`
Baked ${story.scenes.length * langs.length} audio file(s) into stories/${slug}/audio/.
story.json updated: scene.audio.mode = "baked" + per-language caption windows.
Run npm run validate:stories to confirm consistency, then commit the audio files.
Keys were read from the shell environment only and are not stored anywhere.
`)
