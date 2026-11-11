#!/usr/bin/env node
// CI gate for the story factory. Validates every stories/<slug>/story.json:
//   - full Zod schema: hikmah + narration + praise in BOTH languages, ageBand,
//     6–12 scenes, exactly one interaction per scene, valid sfx/bg/pose values
//   - cross-file: character refs exist in characters/ (actors + story cast),
//     interaction targets are scene actors or engine-known props, scene ids unique
//   - slug stable (kebab-case, matches the directory name)
//   - baked-audio consistency: mode "baked" requires audio/<lang>/<scene>.mp3
//     plus a caption window for every scene; orphan captions/mp3s are errors
//   - adab moments (bismillah/salam/alhamdulillah) are expected in the beats —
//     a story with none produces a WARNING (not an error)
// Exit code 1 on any error. Usage: node scripts/validate-stories.mjs [rootDir]

import { z } from 'zod'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ---------------------------------------------------------------- schemas

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ID_RE = /^[a-z0-9][a-z0-9-]*$/

const LocalizedText = z
  .object({ id: z.string().trim().min(1), en: z.string().trim().min(1) })
  .strict()

const Pose = z.enum(['idle', 'happy', 'wave', 'jump'])
/** Keep in sync with BackgroundKey in src/art/backgrounds.ts. */
const Bg = z.enum(['orchard', 'kamar-ezra', 'ruang-tamu'])
const Sfx = z.enum(['pop', 'chime', 'shake', 'whoosh', 'pluck', 'sparkle'])

const Actor = z
  .object({ character: z.string().regex(ID_RE), pose: Pose })
  .strict()

const TapInteraction = z
  .object({
    type: z.literal('tap'),
    target: z.string().regex(ID_RE),
    praise: LocalizedText,
  })
  .strict()

const CountInteraction = z
  .object({
    type: z.literal('count'),
    target: z.string().regex(ID_RE),
    count: z.number().int().min(2).max(10),
    praise: LocalizedText,
  })
  .strict()

const Interaction = z.discriminatedUnion('type', [TapInteraction, CountInteraction])

const Caption = z
  .object({
    line: z.string().regex(ID_RE),
    lang: z.enum(['id', 'en']),
    tStart: z.number().min(0),
    tEnd: z.number().min(0),
  })
  .strict()
  .refine((caption) => caption.tEnd > caption.tStart, {
    message: 'caption tEnd must be greater than tStart',
  })

const SceneAudio = z
  .object({ mode: z.enum(['tts', 'baked']), captions: z.array(Caption) })
  .strict()

const Scene = z
  .object({
    id: z.string().regex(ID_RE),
    bg: Bg,
    actors: z.array(Actor).max(6),
    narration: LocalizedText,
    interactions: z.array(Interaction).length(1),
    sfx: Sfx.optional(),
    audio: SceneAudio.optional(),
  })
  .strict()

const Hikmah = z
  .object({
    id: z.string().trim().min(1),
    en: z.string().trim().min(1),
    prompts: z.array(LocalizedText).min(1).max(3),
  })
  .strict()

const Story = z
  .object({
    slug: z.string().regex(SLUG_RE, 'slug must be stable kebab-case'),
    title: LocalizedText,
    ageBand: z.enum(['2-3', '3-4', '4-5']),
    characters: z.array(z.string().regex(ID_RE)).min(1),
    scenes: z.array(Scene).min(6).max(12),
    hikmah: Hikmah,
  })
  .strict()

const CharacterFile = z
  .object({
    id: z.string().regex(ID_RE),
    name: z.string().trim().min(1),
    species: z.string().trim().min(1),
    role: LocalizedText,
    traits: z.array(z.string().trim().min(1)).min(1),
    artNotes: z.string().trim().min(1),
  })
  .strict()

/** Keep in sync with KNOWN_PROPS in src/art/props.ts. */
const KNOWN_PROPS = new Set(['tree', 'basket', 'fruits', 'water'])

const ADAB_MARKERS = /bismillah|assalamualaikum|alhamdulillah/i

// ---------------------------------------------------------------- helpers

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`cannot read JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/** Validate a single story directory; returns { errors, warnings }. */
export function validateStoryDir(storyDir, characterIds) {
  const errors = []
  const warnings = []
  const slug = basename(storyDir)
  const storyPath = join(storyDir, 'story.json')

  let parsed
  try {
    parsed = Story.safeParse(readJson(storyPath))
  } catch (error) {
    errors.push(`${slug}: ${error instanceof Error ? error.message : String(error)}`)
    return { slug, errors, warnings }
  }
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = ['story', ...issue.path.map(String)]
      errors.push(`${slug}: ${path.join('.')}: ${issue.message}`)
    }
    return { slug, errors, warnings }
  }
  const story = parsed.data

  if (story.slug !== slug) {
    errors.push(`${slug}: slug "${story.slug}" does not match directory name "${slug}"`)
  }

  // Character references must exist in characters/.
  const refs = new Set([...story.characters, ...story.scenes.flatMap((scene) => scene.actors.map((actor) => actor.character))])
  for (const ref of refs) {
    if (!characterIds.has(ref)) {
      errors.push(`${slug}: character "${ref}" has no characters/${ref}.json`)
    }
  }

  // Interaction targets: an actor in that scene or an engine-known prop.
  for (const scene of story.scenes) {
    const actorIds = new Set(scene.actors.map((actor) => actor.character))
    const interaction = scene.interactions[0]
    if (interaction.type === 'count') {
      if (actorIds.has(interaction.target)) {
        errors.push(`${slug}: scene "${scene.id}": count interaction target must be a prop, not an actor`)
      } else if (!KNOWN_PROPS.has(interaction.target)) {
        errors.push(`${slug}: scene "${scene.id}": unknown prop "${interaction.target}"`)
      }
    } else if (!actorIds.has(interaction.target) && !KNOWN_PROPS.has(interaction.target)) {
      errors.push(
        `${slug}: scene "${scene.id}": target "${interaction.target}" is neither a scene actor nor a known prop`,
      )
    }
  }

  // Baked audio ↔ caption consistency.
  const audioDir = join(storyDir, 'audio')
  const audioFiles = new Set()
  if (existsSync(audioDir)) {
    for (const lang of readdirSync(audioDir)) {
      const langDir = join(audioDir, lang)
      if (!statSync(langDir).isDirectory()) continue
      for (const file of readdirSync(langDir)) {
        if (file.endsWith('.mp3')) audioFiles.add(`${lang}/${file.replace(/\.mp3$/, '')}`)
      }
    }
  }

  let bakedScenes = 0
  for (const scene of story.scenes) {
    const audio = scene.audio
    if (audio?.mode === 'baked') {
      bakedScenes += 1
      if (!audioFiles.has(`id/${scene.id}`)) {
        errors.push(`${slug}: scene "${scene.id}": baked audio missing stories/${slug}/audio/id/${scene.id}.mp3`)
      }
      if (!audio.captions.some((caption) => caption.line === scene.id && caption.lang === 'id')) {
        errors.push(`${slug}: scene "${scene.id}": baked audio needs an id caption window (line === scene id, lang === "id")`)
      }
      for (const caption of audio.captions) {
        if (caption.line !== scene.id) {
          errors.push(`${slug}: scene "${scene.id}": caption line "${caption.line}" does not match its scene`)
        } else if (!audioFiles.has(`${caption.lang}/${caption.line}`)) {
          errors.push(`${slug}: scene "${scene.id}": caption references missing audio/${caption.lang}/${caption.line}.mp3`)
        }
      }
    }
    const hasOrphanFile = ['id', 'en'].some((lang) => audioFiles.has(`${lang}/${scene.id}`))
    if (hasOrphanFile && audio?.mode !== 'baked') {
      warnings.push(
        `${slug}: scene "${scene.id}": audio/<lang>/${scene.id}.mp3 exists but audio.mode is not "baked"`,
      )
    }
  }
  if (bakedScenes > 0 && bakedScenes < story.scenes.length) {
    errors.push(
      `${slug}: baked audio must cover ALL scenes (${bakedScenes}/${story.scenes.length} baked) — use mode "tts"`,
    )
  }
  const referencedFiles = new Set(
    story.scenes.flatMap((scene) => (scene.audio?.mode === 'baked' ? [`id/${scene.id}`, `en/${scene.id}`] : [])),
  )
  for (const file of audioFiles) {
    if (!referencedFiles.has(file)) {
      warnings.push(`${slug}: audio/${file}.mp3 is not referenced by any baked scene`)
    }
  }

  // Adab moments are expected in the beats of every story (warning only).
  const narrationText = story.scenes.map((scene) => `${scene.narration.id} ${scene.narration.en}`).join(' ')
  if (!ADAB_MARKERS.test(narrationText)) {
    warnings.push(`${slug}: no adab moment (bismillah/salam/alhamdulillah) in the narration beats`)
  }

  return { slug, errors, warnings }
}

/** Validate characters/ + every story under stories/ (skips _-prefixed dirs). */
export function validateRepo(rootDir) {
  const errors = []
  const warnings = []

  const charactersDir = join(rootDir, 'characters')
  const characterIds = new Set()
  if (!existsSync(charactersDir)) {
    errors.push('characters/: directory missing — stories must reference existing characters')
  } else {
    for (const entry of readdirSync(charactersDir)) {
      if (!entry.endsWith('.json')) continue
      const id = entry.replace(/\.json$/, '')
      let parsed
      try {
        parsed = CharacterFile.safeParse(readJson(join(charactersDir, entry)))
      } catch (error) {
        errors.push(`characters/${entry}: ${error instanceof Error ? error.message : String(error)}`)
        continue
      }
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`characters/${entry}: ${issue.path.join('.')}: ${issue.message}`)
        }
        continue
      }
      if (parsed.data.id !== id) {
        errors.push(`characters/${entry}: id "${parsed.data.id}" does not match file name "${id}"`)
        continue
      }
      characterIds.add(id)
    }
  }

  const storiesDir = join(rootDir, 'stories')
  if (!existsSync(storiesDir)) {
    errors.push('stories/: directory missing — the repo is the story factory, it needs stories')
    return { errors, warnings }
  }
  let storyCount = 0
  for (const entry of readdirSync(storiesDir)) {
    if (entry.startsWith('_') || entry.startsWith('.')) continue
    const storyDir = join(storiesDir, entry)
    if (!statSync(storyDir).isDirectory()) continue
    if (!existsSync(join(storyDir, 'story.json'))) {
      errors.push(`stories/${entry}: story.json missing`)
      continue
    }
    storyCount += 1
    const result = validateStoryDir(storyDir, characterIds)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }
  if (storyCount === 0) {
    errors.push('stories/: no story found (add one via npm run new-story -- <slug>)')
  }

  return { errors, warnings }
}

// ------------------------------------------------------------------- CLI

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  const rootDir = fileURLToPath(new URL('..', import.meta.url))
  const targetDir = process.argv[2] ? join(process.cwd(), process.argv[2]) : rootDir
  const { errors, warnings } = validateRepo(targetDir)

  for (const warning of warnings) console.warn(`  warn  ${warning}`)
  if (errors.length > 0) {
    for (const error of errors) console.error(`  error  ${error}`)
    console.error(`\nvalidate:stories FAILED — ${errors.length} error(s), ${warnings.length} warning(s)`)
    process.exit(1)
  }
  console.warn(
    `validate:stories OK${warnings.length ? ` — ${warnings.length} warning(s)` : ''}`,
  )
}
