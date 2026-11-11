import type { Lang, LocalizedText } from '../story/types'

export type ProviderId = 'browser' | 'google' | 'elevenlabs'

export interface SpeakRequest {
  text: string
  lang: Lang
  /**
   * Karaoke callback: word index + character index of the word start in
   * `text` (browser provider maps SpeechSynthesis boundary events; live
   * HTTP providers cannot emit these — the player falls back to
   * duration-interpolated highlighting).
   */
  onWord?: (wordIndex: number, charIndex: number) => void
  onEnd?: () => void
  onError?: () => void
}

export interface AudioProvider {
  id: ProviderId
  label: LocalizedText
  /** True when a key (or no key, for `browser`) is present in this device's storage. */
  isConfigured(): boolean
  /** Speak a line; resolves when playback finished or was cancelled. */
  speak(request: SpeakRequest): Promise<void>
  cancel(): void
}

/** Settings storage keys — everything lives ONLY in localStorage, never the repo. */
export const AUDIO_SETTINGS_KEYS = {
  provider: 'kisahq.audio.provider',
  googleKey: 'kisahq.audio.google.key',
  googleVoice: 'kisahq.audio.google.voice',
  elevenlabsKey: 'kisahq.audio.elevenlabs.key',
  elevenlabsVoice: 'kisahq.audio.elevenlabs.voice',
} as const

export function readSetting(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Best-effort persistence; settings stay valid for the session anyway.
  }
}
