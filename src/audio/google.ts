import type { AudioProvider, SpeakRequest } from './types'
import { AUDIO_SETTINGS_KEYS, readSetting } from './types'

/**
 * `google` provider — Google Cloud TTS, id-ID (Chirp 3 HD). Wired but
 * keyless-ok: without a key in the parent-gate "Suara" tab the registry never
 * selects it. The key lives ONLY in this browser's localStorage; requests go
 * straight from the parent's browser to Google.
 */

const DEFAULT_VOICE = 'id-ID-Chirp3-HD-Aoede'

interface SynthesizeResponse {
  audioContent?: string
  error?: { message?: string }
}

export class GoogleTtsProvider implements AudioProvider {
  readonly id = 'google' as const
  readonly label = { id: 'Google TTS (perlu kunci)', en: 'Google TTS (needs a key)' }

  private audio: HTMLAudioElement | undefined
  private settle: (() => void) | undefined

  isConfigured(): boolean {
    return readSetting(AUDIO_SETTINGS_KEYS.googleKey) !== ''
  }

  cancel(): void {
    this.audio?.pause()
    this.audio = undefined
    this.settle?.()
    this.settle = undefined
  }

  async speak(request: SpeakRequest): Promise<void> {
    const key = readSetting(AUDIO_SETTINGS_KEYS.googleKey)
    if (!key) {
      request.onError?.()
      return
    }
    const voice = readSetting(AUDIO_SETTINGS_KEYS.googleVoice) || DEFAULT_VOICE
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: request.text },
            voice: {
              languageCode: request.lang === 'id' ? 'id-ID' : 'en-US',
              name: voice,
            },
            audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
          }),
        },
      )
      const json = (await response.json()) as SynthesizeResponse
      if (!response.ok || !json.audioContent) {
        throw new Error(json.error?.message ?? 'Google TTS error')
      }
      await this.play(request, `data:audio/mpeg;base64,${json.audioContent}`)
    } catch {
      request.onError?.()
    }
  }

  private play(request: SpeakRequest, src: string): Promise<void> {
    this.cancel()
    return new Promise<void>((resolve) => {
      const audio = new Audio(src)
      this.audio = audio
      this.settle = () => {
        request.onEnd?.()
        resolve()
      }
      audio.onended = () => this.settle?.()
      audio.onerror = () => {
        request.onError?.()
        resolve()
      }
      void audio.play()
    })
  }
}
