import type { AudioProvider, SpeakRequest } from './types'
import { AUDIO_SETTINGS_KEYS, readSetting } from './types'

/**
 * `elevenlabs` provider — ElevenLabs multilingual (most expressive Indonesian
 * narration). Wired but keyless-ok: needs the owner's key + optional voice id
 * in the parent-gate "Suara" tab; keys never leave this browser's storage.
 */

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

export class ElevenLabsProvider implements AudioProvider {
  readonly id = 'elevenlabs' as const
  readonly label = { id: 'ElevenLabs (perlu kunci)', en: 'ElevenLabs (needs a key)' }

  private audio: HTMLAudioElement | undefined
  private objectUrl: string | undefined
  private settle: (() => void) | undefined

  isConfigured(): boolean {
    return readSetting(AUDIO_SETTINGS_KEYS.elevenlabsKey) !== ''
  }

  cancel(): void {
    this.audio?.pause()
    this.audio = undefined
    this.revokeObjectUrl()
    this.settle?.()
    this.settle = undefined
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = undefined
    }
  }

  async speak(request: SpeakRequest): Promise<void> {
    const key = readSetting(AUDIO_SETTINGS_KEYS.elevenlabsKey)
    if (!key) {
      request.onError?.()
      return
    }
    const voiceId = readSetting(AUDIO_SETTINGS_KEYS.elevenlabsVoice) || DEFAULT_VOICE_ID
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: request.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 },
          }),
        },
      )
      if (!response.ok) {
        throw new Error(`ElevenLabs error ${response.status}`)
      }
      const blob = await response.blob()
      await this.play(request, URL.createObjectURL(blob))
    } catch {
      request.onError?.()
    }
  }

  private play(request: SpeakRequest, src: string): Promise<void> {
    this.cancel()
    return new Promise<void>((resolve) => {
      const audio = new Audio(src)
      this.audio = audio
      if (src.startsWith('blob:')) this.objectUrl = src
      this.settle = () => {
        request.onEnd?.()
        resolve()
      }
      audio.onended = () => {
        this.revokeObjectUrl()
        this.settle?.()
      }
      audio.onerror = () => {
        this.revokeObjectUrl()
        request.onError?.()
        resolve()
      }
      void audio.play()
    })
  }
}
