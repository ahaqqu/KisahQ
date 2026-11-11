import type { Lang, LocalizedText } from '../story/types'

/**
 * Minimal typed dictionary instead of i18next (recorded in docs/TOOLING.md):
 * story-content i18n parity is enforced by the CI validator, and the UI chrome
 * is small — a zero-dependency dictionary with compile-time key checking is
 * clearly lighter than shipping an i18n runtime to a toddler's device.
 */

export const DEFAULT_LANG: Lang = 'id'

const STORAGE_KEY = 'kisahq.lang'

/**
 * UI strings. `en` must carry the exact same keys as `id` — this is checked at
 * compile time by the `satisfies` clause and at test time by tests/i18n.test.ts.
 */
export const UI_STRINGS = {
  id: {
    startTitle: 'KisahQ',
    startSubtitle: 'Kisah interaktif berhikmah untuk anak usia 2–5 tahun',
    startButton: 'Mulai Kisah',
    albumTitle: 'Album Hikmah',
    albumEmpty: 'Selesaikan kisah untuk mengumpulkan stiker!',
    albumStickerAria: 'Putar ulang hikmah',
    narrationReplay: 'Putar ulang cerita',
    next: 'Lanjut',
    tapHint: 'Ketuk yang berkedip!',
    parentGate: 'Untuk Orang Tua',
    parentGateHint: 'Tahan untuk membuka menu orang tua',
    parentMenuTitle: 'Menu Orang Tua',
    tabLanguage: 'Bahasa',
    tabSound: 'Suara',
    tabAbout: 'Tentang',
    languageLabel: 'Pilih bahasa',
    soundProvider: 'Penyedia suara',
    soundProviderBrowser: 'Suara Perangkat (gratis)',
    soundProviderGoogle: 'Google TTS (perlu kunci)',
    soundProviderElevenlabs: 'ElevenLabs (perlu kunci)',
    apiKeyLabel: 'Kunci API (disimpan hanya di perangkat ini)',
    voiceIdLabel: 'ID suara (opsional)',
    soundNote:
      'Kunci API hanya tersimpan di peramban ini dan tidak pernah dikirim ke repositori. Tanpa kunci, aplikasi tetap berfungsi dengan suara perangkat.',
    aboutText:
      'KisahQ adalah aplikasi kisah interaktif berhikmah untuk anak usia 2–5 tahun. Tanpa iklan, tanpa pelacakan, tanpa pengumpulan data. Preferensi bahasa dan suara disimpan di perangkat ini saja.',
    hikmahTitle: 'Hikmah',
    hikmahPromptsTitle: 'Untuk Ayah dan Bunda',
    playAgain: 'Main Lagi',
    backHome: 'Beranda',
    close: 'Tutup',
    narrationUnavailable: 'Suara narasi tidak tersedia di perangkat ini — naskah tetap tampil.',
    storyNotLoaded: 'Kisah belum bisa dimuat. Coba lagi ya.',
  },
  en: {
    startTitle: 'KisahQ',
    startSubtitle: 'Interactive stories with hikmah for children aged 2–5',
    startButton: 'Start Story',
    albumTitle: 'Hikmah Album',
    albumEmpty: 'Finish a story to collect stickers!',
    albumStickerAria: 'Replay hikmah',
    narrationReplay: 'Replay narration',
    next: 'Next',
    tapHint: 'Tap the blinking one!',
    parentGate: 'For Parents',
    parentGateHint: 'Hold to open the parent menu',
    parentMenuTitle: 'Parent Menu',
    tabLanguage: 'Language',
    tabSound: 'Sound',
    tabAbout: 'About',
    languageLabel: 'Choose language',
    soundProvider: 'Voice provider',
    soundProviderBrowser: 'Device voice (free)',
    soundProviderGoogle: 'Google TTS (needs a key)',
    soundProviderElevenlabs: 'ElevenLabs (needs a key)',
    apiKeyLabel: 'API key (stored on this device only)',
    voiceIdLabel: 'Voice ID (optional)',
    soundNote:
      'API keys stay in this browser only and never reach the repository. Without a key the app works fully with the device voice.',
    aboutText:
      'KisahQ is an interactive story app with hikmah for children aged 2–5. No ads, no tracking, no data collection. Language and sound preferences are stored on this device only.',
    hikmahTitle: 'Hikmah',
    hikmahPromptsTitle: 'For Mom and Dad',
    playAgain: 'Play Again',
    backHome: 'Home',
    close: 'Close',
    narrationUnavailable: 'Voice narration is unavailable on this device — the text still shows.',
    storyNotLoaded: 'The story could not be loaded. Please try again.',
  },
} as const satisfies Record<Lang, Record<UIKey, string>>

type UIKey =
  | 'startTitle'
  | 'startSubtitle'
  | 'startButton'
  | 'albumTitle'
  | 'albumEmpty'
  | 'albumStickerAria'
  | 'narrationReplay'
  | 'next'
  | 'tapHint'
  | 'parentGate'
  | 'parentGateHint'
  | 'parentMenuTitle'
  | 'tabLanguage'
  | 'tabSound'
  | 'tabAbout'
  | 'languageLabel'
  | 'soundProvider'
  | 'soundProviderBrowser'
  | 'soundProviderGoogle'
  | 'soundProviderElevenlabs'
  | 'apiKeyLabel'
  | 'voiceIdLabel'
  | 'soundNote'
  | 'aboutText'
  | 'hikmahTitle'
  | 'hikmahPromptsTitle'
  | 'playAgain'
  | 'backHome'
  | 'close'
  | 'narrationUnavailable'
  | 'storyNotLoaded'

/** Counting words 1–10, spoken during count interactions. */
const COUNT_WORDS: Record<Lang, string[]> = {
  id: ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'],
  en: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
}

let currentLang: Lang = loadLang()

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'id' || stored === 'en') return stored
  } catch {
    // localStorage unavailable (private mode) — default language is fine.
  }
  return DEFAULT_LANG
}

export function getLang(): Lang {
  return currentLang
}

export function setLang(lang: Lang): void {
  currentLang = lang
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Preference is best-effort; the session keeps the chosen language.
  }
}

/** Translate a UI key in the current language. */
export function t(key: UIKey): string {
  return UI_STRINGS[currentLang][key]
}

/** Pick the current language from a localized story field. */
export function localized(text: LocalizedText): string {
  return text[currentLang]
}

/** Spoken word for n (1-based) during count interactions. */
export function countWord(n: number): string {
  const words = COUNT_WORDS[currentLang]
  return words[Math.min(Math.max(n - 1, 0), words.length - 1)]
}
