/**
 * Story domain types — mirrored 1:1 by the Zod schema in
 * scripts/validate-stories.mjs (CI gate). The runtime loader does light
 * structural checks only; the validator is the enforcement layer.
 */

export type Lang = 'id' | 'en'

/** A string that must exist in BOTH languages (validator-enforced parity). */
export interface LocalizedText {
  id: string
  en: string
}

export type Pose = 'idle' | 'happy' | 'wave' | 'jump'

export interface Actor {
  /** Character id — must exist as characters/<id>.json (validator-enforced). */
  character: string
  pose: Pose
}

export interface TapInteraction {
  type: 'tap'
  /** Actor character id or engine-known prop id (tree, basket, fruits, water...). */
  target: string
  praise: LocalizedText
}

/** Tap N items one at a time — the toddler counting mechanic (1–5 aloud). */
export interface CountInteraction {
  type: 'count'
  target: string
  count: number
  praise: LocalizedText
}

export type Interaction = TapInteraction | CountInteraction

export type Sfx = 'pop' | 'chime' | 'shake' | 'whoosh' | 'pluck' | 'sparkle'

/**
 * Caption timing for a scene's baked audio: the narration window inside that
 * scene's per-language MP3 (line = scene id). Seconds.
 */
export interface Caption {
  line: string
  lang: Lang
  tStart: number
  tEnd: number
}

export interface SceneAudio {
  mode: 'tts' | 'baked'
  captions: Caption[]
}

export interface Scene {
  id: string
  /** Background key implemented by src/art (validator: known bg registry). */
  bg: string
  actors: Actor[]
  narration: LocalizedText
  interactions: Interaction[]
  sfx?: Sfx
  audio?: SceneAudio
}

export interface Hikmah {
  /** The one-sentence moral — REQUIRED in both languages (CI-enforced). */
  id: string
  en: string
  prompts: LocalizedText[]
}

export interface Story {
  slug: string
  title: LocalizedText
  ageBand: '2-3' | '3-4' | '4-5'
  characters: string[]
  scenes: Scene[]
  hikmah: Hikmah
}
