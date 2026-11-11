import type { Lang } from '../story/types'
import type { AudioProvider, SpeakRequest } from './types'

/**
 * `browser` provider — Web Speech API (speechSynthesis). Default, free,
 * keyless. Prefers an id-ID voice; emits word-boundary events for the
 * narration karaoke highlight.
 */

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const exact = voices.find((voice) => voice.lang.toLowerCase() === `${lang}-${lang}`)
  const prefix = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang))
  return exact ?? prefix ?? undefined
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export class BrowserProvider implements AudioProvider {
  readonly id = 'browser' as const
  readonly label = { id: 'Suara Perangkat (gratis)', en: 'Device voice (free)' }

  isConfigured(): boolean {
    return speechSupported()
  }

  cancel(): void {
    if (speechSupported()) window.speechSynthesis.cancel()
  }

  async speak(request: SpeakRequest): Promise<void> {
    if (!speechSupported()) {
      request.onError?.()
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(request.text)
    utterance.lang = request.lang === 'id' ? 'id-ID' : 'en-US'
    const voice = pickVoice(request.lang)
    if (voice) utterance.voice = voice
    // Slightly slow + a touch high: toddler-friendly pacing.
    utterance.rate = 0.85
    utterance.pitch = 1.05

    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (!settled) {
          settled = true
          request.onEnd?.()
          resolve()
        }
      }
      utterance.onend = finish
      utterance.onerror = () => {
        request.onError?.()
        finish()
      }
      if (request.onWord) {
        utterance.onboundary = (event: SpeechSynthesisEvent) => {
          if (event.name && event.name !== 'word') return
          request.onWord?.(wordIndexForChar(request.text, event.charIndex), event.charIndex)
        }
      }
      synth.speak(utterance)
    })
  }
}

/** Map a character index (SpeechSynthesis boundary) to the 0-based word index. */
export function wordIndexForChar(text: string, charIndex: number): number {
  let index = 0
  let word = 0
  let inWord = false
  while (index <= charIndex && index < text.length) {
    const isLetter = /\S/.test(text[index])
    if (isLetter && !inWord) {
      if (index === charIndex) return word
      inWord = true
      word += 1
    } else if (!isLetter) {
      inWord = false
    }
    if (index === charIndex) return Math.max(0, word - 1)
    index += 1
  }
  return Math.max(0, word - 1)
}
