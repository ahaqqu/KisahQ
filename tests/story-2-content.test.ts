import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateStoryDir } from '../scripts/validate-stories.mjs'
import {
  QILA_EZRA_BG_KEYS,
  QILA_EZRA_CHARACTERS,
  renderEzra,
  renderPetaMainan,
  renderQila,
  renderQilaEzraBackground,
  renderRumahTruk,
  renderTruk,
  type EzraExpression,
  type QilaExpression,
} from '../src/art/qila-ezra'
import type { Pose } from '../src/story/types'

/**
 * Story 2 content pins — "Qila dan Ezra: Truk Ezra Hilang!" (personal cast).
 * Pins the CI validator's verdict on the real story directory, the owner's
 * character canon VERBATIM (traits, hikmah, the cerewet line, Ezra's joke,
 * Qila's syukur line), the toddler narration rules (≤8 words per sentence,
 * id+en parity), and the Bold Flat Pop art canon (Qila's hijab in EVERY
 * render, Ezra's dimples in EVERY render).
 */

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const SLUG = 'qila-ezra-truk-hilang'
const STORY_DIR = join(ROOT, 'stories', SLUG)

// Owner canon (manager brief, verbatim — do not paraphrase).
const CEREWET_LINE = 'Kakak sudah bilang, taruh mainan di tempatnya!'
const EZRA_JOKE = 'Truknya ikut sembunyi-sembunyi, hihi!'
const QILA_SYUKUR = 'Alhamdulillah ya, Alhamdulillah ketemu.'
const HIKMAH_ID = 'Kakak dan adik yang saling bantu, masalah jadi ringan.'
const HIKMAH_EN = 'When siblings help each other, every problem gets lighter.'

const QILA_TRAITS = ['cerewet', 'sayang adik', 'jiwa pemimpin']
const EZRA_TRAITS = ['mudah senyum', 'sayang kakak', 'periang dan suka bercanda', 'punya lesung pipit']

const POSES: Pose[] = ['idle', 'happy', 'wave', 'jump']
const QILA_CHIPS: QilaExpression[] = ['cerewet-face', 'warm-leader', 'gentle']
const EZRA_CHIPS: EzraExpression[] = ['easy-smile', 'grin-with-dimples', 'joke-face']

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

function characterJson(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, 'characters', `${id}.json`), 'utf8')) as Record<string, unknown>
}

const story = readJson(join(STORY_DIR, 'story.json'))
const qila = characterJson('qila')
const ezra = characterJson('ezra')

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

describe('story 2 — CI validator verdict on the real story', () => {
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
    expect(story.title.id).toBe('Qila dan Ezra: Truk Ezra Hilang!')
    expect(story.title.en).toBe("Qila and Ezra: Ezra's Truck Is Missing!")
    expect(story.ageBand).toBe('3-4')
  })

  it('has 8–11 scenes (brief band) with unique ids', () => {
    expect(story.scenes.length).toBeGreaterThanOrEqual(8)
    expect(story.scenes.length).toBeLessThanOrEqual(11)
    expect(new Set(story.scenes.map((scene) => scene.id)).size).toBe(story.scenes.length)
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

  it('carries the adab beats (bismillah opener, alhamdulillah at find + close)', () => {
    expect(story.scenes[0].narration.id).toMatch(/bismillah/i)
    expect(story.scenes.at(-1)!.narration.id).toMatch(/alhamdulillah/i)
  })
})

describe('story 2 — hikmah (verbatim, both languages)', () => {
  it('carries the brief hikmah EXACTLY', () => {
    expect(story.hikmah.id).toBe(HIKMAH_ID)
    expect(story.hikmah.en).toBe(HIKMAH_EN)
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

describe('story 2 — character canon (verbatim traits + fictional framing)', () => {
  it('keeps the owner trait lists VERBATIM', () => {
    expect(qila.traits).toEqual(QILA_TRAITS)
    expect(ezra.traits).toEqual(EZRA_TRAITS)
  })

  it('frames both characters as fictional (no surnames, no ages, no photos)', () => {
    for (const sheet of [qila, ezra]) {
      expect(String(sheet.species)).toMatch(/fiksi/)
      expect(String(sheet.artNotes)).toMatch(/no surname, no photos, no real age/)
    }
  })

  it('pins the Bold Flat Pop art notes: hijab always for Qila, dimples always for Ezra', () => {
    const qilaNotes = String(qila.artNotes)
    expect(qilaNotes).toMatch(/hijab/i)
    expect(qilaNotes).toMatch(/ALWAYS/i)
    for (const chip of QILA_CHIPS) expect(qilaNotes).toContain(chip)

    const ezraNotes = String(ezra.artNotes)
    expect(ezraNotes).toMatch(/lesung pipit/i)
    expect(ezraNotes).toMatch(/EVERY render/i)
    for (const chip of EZRA_CHIPS) expect(ezraNotes).toContain(chip)
  })
})

describe('story 2 — canon trait traceability (trait → scene)', () => {
  it('Qila cerewet: the verbatim nag line opens the cerewet scene', () => {
    expect(sceneById('qila-cerewet').narration.id).toContain(CEREWET_LINE)
    expect(sceneById('qila-cerewet').narration.en).toContain('toys go back in their place')
  })

  it('Qila sayang adik: she catches herself and comforts Ezra', () => {
    expect(sceneById('qila-sayang-adik').narration.id).toContain('memeluk Ezra')
    expect(sceneById('qila-sayang-adik').narration.id).toContain('Kakak ada di sini')
  })

  it('Qila jiwa pemimpin: peta mainan plan, leads the search, leads the build', () => {
    expect(sceneById('peta-mainan').narration.id).toContain('peta mainan')
    expect(sceneById('intip-tempat-tidur').narration.id).toContain('Qila memimpin')
    expect(sceneById('rumah-truk').narration.id).toContain('Qila memimpin')
  })

  it('Ezra mudah senyum: his smile drops only in the loss beat, easy smile elsewhere', () => {
    expect(sceneById('beres-beres').narration.en).toContain("Ezra's truck is gone")
    expect(sceneById('ketemu-truk').narration.en).toContain("Ezra's dimples")
  })

  it('Ezra periang suka bercanda: the verbatim joke at the find', () => {
    expect(sceneById('ketemu-truk').narration.id).toContain(EZRA_JOKE)
  })

  it('Ezra lesung pipit: named in narration and pinned in art', () => {
    expect(sceneById('ketemu-truk').narration.id.toLowerCase()).toContain('lesung pipit')
  })

  it('Ezra sayang kakak: thanks kakak at the close; Qila answers with syukur', () => {
    expect(sceneById('syukur-penutup').narration.id).toContain('memeluk Qila')
    expect(sceneById('syukur-penutup').narration.id).toContain('Kakak hebat')
    // Qila's alhamdulillah lands at the find (praise of the ketemu-truk tap).
    expect(sceneById('ketemu-truk').interactions[0].praise.id).toBe(QILA_SYUKUR)
  })
})

describe('story 2 — Bold Flat Pop art pins (src/art/qila-ezra.ts)', () => {
  it('exposes an engine-compatible registry for the follow-up wiring', () => {
    expect(Object.keys(QILA_EZRA_CHARACTERS).sort()).toEqual(['ezra', 'qila'])
    for (const pose of POSES) {
      for (const def of Object.values(QILA_EZRA_CHARACTERS)) {
        expect(def.render(pose)).toMatch(/^<svg viewBox="0 0 160 140"/)
      }
    }
    expect(QILA_EZRA_CHARACTERS.qila.name).toBe(qila.name)
    expect(QILA_EZRA_CHARACTERS.ezra.name).toBe(ezra.name)
  })

  it('renders Qila WITH hijab and WITHOUT visible hair in every pose × chip', () => {
    for (const pose of POSES) {
      for (const expression of QILA_CHIPS) {
        const svg = renderQila(pose, expression)
        expect(svg).toContain('qez-hijab')
        expect(svg).not.toContain('#1F1A2E') // no hair fill outside the hijab
      }
    }
  })

  it('renders Ezra WITH dimples in every pose × chip (canon: always visible)', () => {
    for (const pose of POSES) {
      for (const expression of EZRA_CHIPS) {
        expect(renderEzra(pose, expression)).toContain('qez-dimples')
      }
    }
  })

  it('gives every expression chip a distinct render', () => {
    const qilaOutputs = POSES.flatMap((pose) => QILA_CHIPS.map((chip) => renderQila(pose, chip)))
    const ezraOutputs = POSES.flatMap((pose) => EZRA_CHIPS.map((chip) => renderEzra(pose, chip)))
    expect(new Set(qilaOutputs).size).toBe(POSES.length * QILA_CHIPS.length)
    expect(new Set(ezraOutputs).size).toBe(POSES.length * EZRA_CHIPS.length)
  })

  it('builds the two Bold Flat Pop backgrounds as 3 parallax layers each', () => {
    for (const key of QILA_EZRA_BG_KEYS) {
      const layers = renderQilaEzraBackground(key)
      expect(layers.map((layer) => layer.className)).toEqual([
        'bg-layer bg-layer--far',
        'bg-layer bg-layer--mid',
        'bg-layer bg-layer--near',
      ])
      for (const layer of layers) {
        expect(layer.svg).toContain('<svg')
        expect(layer.svg).toContain('aria-hidden="true"')
      }
    }
  })

  it('renders the truck, the treasure map, and the rumah truk box', () => {
    const truck = renderTruk()
    expect(truck).not.toContain('stroke-dasharray')
    expect(truck).toContain('qez-truk')

    const ghost = renderTruk({ hidden: true })
    expect(ghost).toContain('stroke-dasharray') // dashed silhouette
    expect(ghost).toContain('?') // mystery badge

    expect(renderPetaMainan()).toContain('qez-peta')
    expect(renderRumahTruk()).toContain('qez-rumah-truk')
  })
})
