import { describe, expect, it } from 'vitest'
import { countWord, getLang, localized, setLang, t, UI_STRINGS } from '../src/i18n/index'
import { wordIndexForChar } from '../src/audio/browser'

describe('i18n dictionary parity', () => {
  it('id and en carry the exact same UI keys', () => {
    expect(Object.keys(UI_STRINGS.en).sort()).toEqual(Object.keys(UI_STRINGS.id).sort())
  })

  it('no UI string is empty in either language', () => {
    for (const [key, value] of Object.entries(UI_STRINGS.id)) {
      expect(value.trim().length, `id/${key}`).toBeGreaterThan(0)
      expect((UI_STRINGS.en as Record<string, string>)[key].trim().length, `en/${key}`).toBeGreaterThan(0)
    }
  })
})

describe('i18n runtime', () => {
  it('defaults to Indonesian (id is what a child sees first)', () => {
    expect(getLang()).toBe('id')
    expect(t('startButton')).toBe('Mulai Kisah')
  })

  it('switches to English and back', () => {
    setLang('en')
    expect(t('next')).toBe('Next')
    expect(countWord(3)).toBe('three')
    setLang('id')
    expect(t('next')).toBe('Lanjut')
    expect(countWord(3)).toBe('tiga')
  })

  it('localized() picks the current language', () => {
    setLang('en')
    expect(localized({ id: 'rumah', en: 'house' })).toBe('house')
    setLang('id')
    expect(localized({ id: 'rumah', en: 'house' })).toBe('rumah')
  })

  it('count words cover 1..10 in both languages', () => {
    for (const lang of ['id', 'en'] as const) {
      setLang(lang)
      for (let n = 1; n <= 10; n += 1) {
        expect(countWord(n).length).toBeGreaterThan(0)
      }
    }
    setLang('id')
  })
})

describe('karaoke word mapping (browser TTS boundary events)', () => {
  it('maps charIndex to the 0-based word index', () => {
    const text = 'halo dunia yang manis'
    expect(wordIndexForChar(text, 0)).toBe(0) // "halo"
    expect(wordIndexForChar(text, 5)).toBe(1) // "dunia"
    expect(wordIndexForChar(text, 11)).toBe(2) // "yang"
    expect(wordIndexForChar(text, 16)).toBe(3) // "manis"
  })
})
