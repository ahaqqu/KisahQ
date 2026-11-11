import { BrowserProvider, speechSupported } from './browser'
import { ElevenLabsProvider } from './elevenlabs'
import { GoogleTtsProvider } from './google'
import { AUDIO_SETTINGS_KEYS, readSetting, type AudioProvider, type ProviderId } from './types'

/**
 * Pluggable AudioProvider registry. Resolution per narration line (brief):
 *   1. baked MP3 for that line (if the story ships one) — handled by the player
 *   2. the provider selected in the parent-gate "Suara" tab
 *   3. fallback chain ends in silent playback + captions (never broken)
 */

const PROVIDERS: Record<ProviderId, AudioProvider> = {
  browser: new BrowserProvider(),
  google: new GoogleTtsProvider(),
  elevenlabs: new ElevenLabsProvider(),
}

export const PROVIDER_IDS: ProviderId[] = ['browser', 'google', 'elevenlabs']

export function getProvider(id: ProviderId): AudioProvider {
  return PROVIDERS[id]
}

/** The provider chosen in the Suara tab; defaults to `browser`. */
export function getSelectedProvider(): AudioProvider {
  const stored = readSetting(AUDIO_SETTINGS_KEYS.provider)
  if (stored === 'google' || stored === 'elevenlabs' || stored === 'browser') {
    const provider = PROVIDERS[stored]
    if (provider.isConfigured()) return provider
  }
  return PROVIDERS.browser
}

export function narrationAvailable(): boolean {
  return speechSupported()
}
