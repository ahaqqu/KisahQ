import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateStoryDir } from '../scripts/validate-stories.mjs'
import { CHARACTERS } from '../src/art/characters'

/**
 * Story 3 content pins — "Assalamualaikum, Satu Senyum Damai" (salam story).
 * Pins the CI validator's verdict on the real story directory, the beat plan
 * (10 beats: teach → try → reply → kampung walk → new friend → peace chain →
 * meaning → echo → close), the owner's canon VERBATIM (Qila's cerewet-but-
 * warm nudge, the salam meaning, Ezra's dimples), the toddler narration rules
 * (≤8 words per sentence, id+en parity), and the call-and-response learning
 * core (Assalamualaikum ↔ Waalaikumsalam across the beats).
 */

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const SLUG = 'assalamualaikum-satu-senyum-damai'
const STORY_DIR = join(ROOT, 'stories', SLUG)

// Owner canon (story brief, verbatim — do not paraphrase).
const TITLE_ID = 'Assalamualaikum, Satu Senyum Damai'
const TITLE_EN = 'Assalamualaikum, a Smile of Peace'
const QILA_NUDGE = 'Ezra, jangan berbisik! Ucapkan jelas!'
const SALAM_MEANING_ID = 'semoga keselamatan untukmu'
const SALAM_MEANING_EN = 'peace be upon you'
const HIKMAH_ID = 'Salam bukan sekadar kata — "Assalamualaikum" artinya semoga keselamatan untukmu.'
const HIKMAH_EN = 'Salam is more than a word — "Assalamualaikum" means peace be upon you.'

const CAST = ['qila', 'ezra', 'lili', 'toto', 'nana', 'momo']
const SCENE_IDS = [
  'pembuka',
  'sapa-ayah-bunda',
  'jawab-salam',
  'jalan-musala',
  'teman-baru',
  'sapa-lili',
  'rantai-salam',
  'arti-salam',
  'giliran-kamu',
  'penutup',
]
/** Beats where Ezra's lesung pipit MUST be called out (brief: 2, 6, 10 minimum). */
const DIMPLE_BEATS = ['sapa-ayah-bunda', 'sapa-lili', 'penutup'] as const

interface LocalizedText {
  id: string
  en: string
}
interface StoryJson {
  slug: string
  title: LocalizedText
  ageBand: string
  characters: string[]
  scenes: Array<{
    id: string
    bg: string
    actors: Array<{ character: string; pose: string }>
    narration: LocalizedText
    interactions: Array<{ type: string; target: string; praise: LocalizedText }>
    sfx?: string
  }>
  hikmah: { id: string; en: string; prompts: LocalizedText[] }
}

function readJson(path: string): StoryJson {
  return JSON.parse(readFileSync(path, 'utf8')) as StoryJson
}

const story = readJson(join(STORY_DIR, 'story.json'))

/** Toddler TTS rule: every sentence ≤ 8 words (punctuation-only tokens don't count). */
function sentences(text: string): string[] {
  // Quote marks may trail a terminator ("…!" kata Qila.) — strip them so the
  // split sees the real sentence terminator underneath.
  return text.replace(/["'«»“”]/gu, '').split(/(?<=[.!?…])\s+/u)
}
function wordCount(sentence: string): number {
  return sentence
    .split(/\s+/u)
    .filter((token) => !/^[\p{P}\p{S}]+$/u.test(token))
    .length
}
function assertShortSentences(text: string, label: string): void {
  for (const sentence of sentences(text)) {
    expect(wordCount(sentence), `${label}: "${sentence}"`).toBeLessThanOrEqual(8)
  }
}

function sceneById(id: string) {
  const scene = story.scenes.find((entry) => entry.id === id)
  expect(scene, `scene ${id} exists`).toBeDefined()
  return scene!
}

function sceneText(sceneId: string): string {
  const scene = sceneById(sceneId)
  const praise = scene.interactions[0].praise
  return `${scene.narration.id} ${scene.narration.en} ${praise.id} ${praise.en}`
}

describe('story 3 — CI validator verdict on the real story', () => {
  it('passes validateStoryDir with zero errors AND zero warnings', () => {
    const characterIds = new Set(
      readdirSync(join(ROOT, 'characters'))
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.replace(/\.json$/, '')),
    )
    const { errors, warnings } = validateStoryDir(STORY_DIR, characterIds)
    expect(errors).toEqual([])
    expect(warnings).toEqual([]) // adab beats present → no adab warning either
  })

  it('has a stable slug, both title languages, and the toddler age band', () => {
    expect(story.slug).toBe(SLUG)
    expect(story.title.id).toBe(TITLE_ID)
    expect(story.title.en).toBe(TITLE_EN)
    expect(story.ageBand).toBe('2-3')
  })

  it('has exactly the 10 brief beats, in order, with unique ids', () => {
    expect(story.scenes.length).toBe(10)
    expect(story.scenes.map((scene) => scene.id)).toEqual(SCENE_IDS)
  })

  it('keeps exactly one positive tap interaction per scene, aimed at a scene actor', () => {
    for (const scene of story.scenes) {
      expect(scene.interactions).toHaveLength(1)
      const interaction = scene.interactions[0]
      // Actor-only targets: the .actor band renders at clamp(96px, 24vw, 170px)
      // (src/styles.css), so every target is ≥96px — above the 80px aim and the
      // 64px validator minimum, with no extra CSS needed.
      expect(interaction.type).toBe('tap')
      const actorIds = scene.actors.map((actor) => actor.character)
      expect(actorIds).toContain(interaction.target)
      expect(interaction.praise.id.trim()).not.toBe('')
      expect(interaction.praise.en.trim()).not.toBe('')
    }
  })

  it('keeps every narration and praise sentence ≤ 8 words in BOTH languages', () => {
    for (const scene of story.scenes) {
      assertShortSentences(scene.narration.id, `${scene.id} narration.id`)
      assertShortSentences(scene.narration.en, `${scene.id} narration.en`)
      for (const interaction of scene.interactions) {
        assertShortSentences(interaction.praise.id, `${scene.id} praise.id`)
        assertShortSentences(interaction.praise.en, `${scene.id} praise.en`)
      }
    }
  })

  it('carries the adab beats (bismillah opener, alhamdulillah at close)', () => {
    expect(story.scenes[0].narration.id).toMatch(/bismillah/i)
    expect(story.scenes.at(-1)!.narration.id).toMatch(/alhamdulillah/i)
  })

  it('pins the bg to the place each beat narrates', () => {
    const expected: Record<string, string> = {
      pembuka: 'kamar-ezra', // wake-up morning in Ezra's room
      'sapa-ayah-bunda': 'ruang-tamu',
      'jawab-salam': 'ruang-tamu',
      'jalan-musala': 'orchard', // kampung walk
      'teman-baru': 'orchard', // kampung play spot
      'sapa-lili': 'orchard',
      'rantai-salam': 'orchard',
      'arti-salam': 'ruang-tamu', // gentle landing back home
      'giliran-kamu': 'kamar-ezra', // evening echo
      penutup: 'kamar-ezra',
    }
    for (const scene of story.scenes) {
      expect(scene.bg, scene.id).toBe(expected[scene.id]!)
    }
  })
})

describe('story 3 — the salam learning core (call and response)', () => {
  it('the greeting call is heard across the story beats', () => {
    const callBeats = story.scenes
      .filter((scene) => /assalamualaikum/i.test(scene.narration.id))
      .map((scene) => scene.id)
    for (const id of ['pembuka', 'sapa-ayah-bunda', 'jalan-musala', 'sapa-lili', 'giliran-kamu', 'penutup']) {
      expect(callBeats, `call heard in ${id}`).toContain(id)
    }
    expect(callBeats.length).toBeGreaterThanOrEqual(6)
  })

  it('the reply lands as a taught game, then comes back from friends', () => {
    const replyBeats = story.scenes
      .filter((scene) => sceneText(scene.id).match(/waalaikumsalam/i))
      .map((scene) => scene.id)
    expect(replyBeats).toEqual(expect.arrayContaining(['jawab-salam', 'sapa-lili', 'penutup']))
    // Call-and-response order: Qila teaches the reply AFTER Ezra's first tries.
    expect(story.scenes.findIndex((scene) => scene.id === 'jawab-salam')).toBeGreaterThan(
      story.scenes.findIndex((scene) => scene.id === 'sapa-ayah-bunda'),
    )
  })

  it('the echo refrain invites the toddler to SAY it (interactive echo)', () => {
    const echo = sceneById('giliran-kamu')
    expect(echo.narration.id).toContain('giliranmu')
    expect(echo.narration.id).toContain('Assalamualaikum')
    expect(echo.narration.en).toContain('your turn')
    expect(echo.interactions[0].praise.id).toContain('Assalamualaikum')
  })

  it('the closing offers the greeting to the VIEWER and invites the reply', () => {
    const close = sceneById('penutup')
    expect(close.narration.id).toContain('menatap kamu')
    expect(close.narration.en).toContain('looks at you')
    expect(close.interactions[0].praise.id).toMatch(/^Waalaikumsalam/)
    expect(close.interactions[0].praise.en).toMatch(/^Waalaikumsalam/)
  })
})

describe('story 3 — hikmah (verbatim, both languages)', () => {
  it('carries the brief hikmah EXACTLY', () => {
    expect(story.hikmah.id).toBe(HIKMAH_ID)
    expect(story.hikmah.en).toBe(HIKMAH_EN)
  })

  it('teaches the meaning in the hikmah beat before the end card', () => {
    const meaning = sceneById('arti-salam')
    expect(meaning.narration.id).toContain(SALAM_MEANING_ID)
    expect(meaning.narration.id).toContain('doa damai')
    expect(meaning.narration.en).toContain(SALAM_MEANING_EN)
    expect(meaning.narration.en).toContain('prayer of peace')
  })

  it('ships 2–3 parent prompts with full id+en parity', () => {
    expect(story.hikmah.prompts.length).toBeGreaterThanOrEqual(2)
    expect(story.hikmah.prompts.length).toBeLessThanOrEqual(3)
    for (const prompt of story.hikmah.prompts) {
      expect(prompt.id.trim()).not.toBe('')
      expect(prompt.en.trim()).not.toBe('')
    }
  })
})

describe('story 3 — character canon traceability (trait → scene)', () => {
  it('keeps the personal cast and adds the kampung friends for the peace chain', () => {
    expect(story.characters).toEqual(CAST)
    const peaceChain = sceneById('rantai-salam')
    expect(peaceChain.actors.map((actor) => actor.character)).toEqual(CAST) // max-6 full cast
    expect(peaceChain.narration.id).toContain('kampung')
    expect(peaceChain.narration.id).toContain('tersenyum')
  })

  it('Qila teaches the greeting first (leader heart opens the story)', () => {
    expect(sceneById('pembuka').narration.id).toContain('Kak Qila menyapa')
    expect(sceneById('pembuka').narration.id).toContain('Assalamualaikum')
  })

  it('Qila cerewet-but-warm: the verbatim nudge, then the warm praise', () => {
    const nudge = sceneById('teman-baru')
    expect(nudge.narration.id).toContain(QILA_NUDGE)
    expect(nudge.narration.en).toContain('no whispering')
    expect(nudge.interactions[0].praise.id).toContain('sayang') // never mean
    expect(nudge.interactions[0].praise.en).toContain('loves')
  })

  it('Ezra shy beat precedes his brave try (smile-drop is rare, story-carrying)', () => {
    expect(sceneById('teman-baru').narration.id).toContain('malu')
    expect(sceneById('sapa-lili').narration.id).toContain('menarik napas')
  })

  it('Ezra lesung pipit: named in the dimple beats 2, 6, 10 in BOTH languages', () => {
    for (const id of DIMPLE_BEATS) {
      expect(sceneById(id).narration.id.toLowerCase()).toContain('lesung pipit')
      expect(sceneById(id).narration.en).toContain('dimple')
    }
  })

  it('salam etiquette: hand-on-heart at the kampung walk, musala scenery', () => {
    const walk = sceneById('jalan-musala')
    expect(walk.narration.id).toContain('Tangan di dada')
    expect(walk.narration.en).toContain('Hand on heart')
    expect(walk.interactions[0].praise.id).toContain('Tangan di dada')
    expect(walk.interactions[0].praise.en).toContain('Hand on heart')
    expect(walk.narration.id).toContain('musala')
    expect(walk.narration.en).toContain('musala')
  })
})

describe('story 3 — Bold Flat Pop art canon renders through the engine registry', () => {
  it('every Qila scene render carries the hijab (canon: ALWAYS on)', () => {
    for (const scene of story.scenes) {
      const qilaActor = scene.actors.find((actor) => actor.character === 'qila')
      if (!qilaActor) continue
      const svg = CHARACTERS.qila!.render(qilaActor.pose as 'idle')
      expect(svg, scene.id).toContain('qez-hijab')
      expect(svg, scene.id).not.toContain('#1F1A2E') // no hair fill outside the hijab
    }
  })

  it('every Ezra scene render carries the dimples (canon: EVERY render)', () => {
    for (const scene of story.scenes) {
      const ezraActor = scene.actors.find((actor) => actor.character === 'ezra')
      if (!ezraActor) continue
      expect(CHARACTERS.ezra!.render(ezraActor.pose as 'idle'), scene.id).toContain('qez-dimples')
    }
  })

  it('every scene actor resolves from CHARACTERS and renders its scene pose', () => {
    for (const scene of story.scenes) {
      for (const actor of scene.actors) {
        const def = CHARACTERS[actor.character]
        expect(def, `CHARACTERS["${actor.character}"] for ${scene.id}`).toBeDefined()
        expect(() => def.render(actor.pose as 'idle'), `${scene.id}/${actor.character}`).not.toThrow()
      }
    }
  })
})
