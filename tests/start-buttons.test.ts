// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderStoryButtons, type StoryButtonEntry } from '../src/engine/start-buttons'
import { REGISTERED_STORIES, STORY_TITLES } from '../src/story/loader'
import { getLang, localized, setLang, t } from '../src/i18n'

/**
 * Start-screen story buttons (F2 fix). Every button must be visibly two-line
 * (UI label + story title) AND carry a distinct accessible name — with two
 * registered stories the start screen used to render two identical
 * "Mulai Kisah" buttons (a data gap for parents picking the story and an
 * accessibility gap for screen readers). The registry is injected, so the
 * two-button pin runs on synthetic entries regardless of how many stories
 * ship today; a second pin walks the REAL registry and fails if the static
 * title manifest ever drifts from stories/<slug>/story.json.
 */

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

const ENTRIES: StoryButtonEntry[] = [
  { slug: 'kisah-contoh-a', title: { id: 'Kisah Contoh A', en: 'Example Story A' } },
  { slug: 'kisah-contoh-b', title: { id: 'Kisah Contoh B', en: 'Example Story B' } },
]

interface StoryJson {
  slug: string
  title: { id: string; en: string }
}

function accessibleName(button: HTMLButtonElement): string {
  // aria-label overrides the text content — it IS the accessible name.
  return button.getAttribute('aria-label') ?? ''
}

describe('start story buttons — accessibility pin (F2)', () => {
  it('two buttons get two DISTINCT accessible names', () => {
    const container = document.createElement('div')
    renderStoryButtons(container, ENTRIES, () => {})

    const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')]
    expect(buttons).toHaveLength(2)

    const names = buttons.map(accessibleName)
    expect(new Set(names).size).toBe(2)
    expect(names).toEqual([
      `${t('startButton')} — Kisah Contoh A`,
      `${t('startButton')} — Kisah Contoh B`,
    ])
  })

  it('renders the two-line layout: UI label over the story title', () => {
    const container = document.createElement('div')
    renderStoryButtons(container, ENTRIES, () => {})

    const button = container.querySelector<HTMLButtonElement>('button')!
    expect(button.classList.contains('start-button')).toBe(true)
    expect(button.dataset.slug).toBe('kisah-contoh-a')
    expect(button.querySelector('.start-button__label')?.textContent).toBe(t('startButton'))
    expect(button.querySelector('.start-button__title')?.textContent).toBe('Kisah Contoh A')
  })

  it('opens the story whose button was clicked', () => {
    const container = document.createElement('div')
    const opened: string[] = []
    renderStoryButtons(container, ENTRIES, (slug) => opened.push(slug))

    const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')]
    buttons[1]!.click()
    expect(opened).toEqual(['kisah-contoh-b'])
  })

  it('localizes the title per the app language (titles are content, not i18n keys)', () => {
    expect(getLang()).toBe('id')

    const id = document.createElement('div')
    renderStoryButtons(id, ENTRIES, () => {})
    expect(id.querySelector('.start-button__title')?.textContent).toBe('Kisah Contoh A')
    expect(accessibleName(id.querySelector('button')!)).toBe('Mulai Kisah — Kisah Contoh A')

    setLang('en')
    const en = document.createElement('div')
    renderStoryButtons(en, ENTRIES, () => {})
    expect(en.querySelector('.start-button__title')?.textContent).toBe('Example Story A')
    expect(accessibleName(en.querySelector('button')!)).toBe('Start Story — Example Story A')

    setLang('id')
  })
})

describe('start story buttons — real registry', () => {
  it('STORY_TITLES mirrors every registered story.json title', () => {
    for (const slug of REGISTERED_STORIES) {
      const story = JSON.parse(
        readFileSync(join(ROOT, 'stories', slug, 'story.json'), 'utf8'),
      ) as StoryJson
      expect(story.slug, slug).toBe(slug)
      expect(STORY_TITLES[slug], slug).toEqual(story.title)
    }
  })

  it('registered titles stay distinct, so real buttons never collapse to one name', () => {
    expect(REGISTERED_STORIES.length).toBeGreaterThanOrEqual(1)
    for (const lang of ['id', 'en'] as const) {
      const titles = REGISTERED_STORIES.map((slug) => STORY_TITLES[slug][lang])
      expect(new Set(titles).size, `${lang} titles`).toBe(REGISTERED_STORIES.length)
    }
    const names = REGISTERED_STORIES.map(
      (slug) => `${t('startButton')} — ${localized(STORY_TITLES[slug])}`,
    )
    expect(new Set(names).size).toBe(REGISTERED_STORIES.length)
  })
})
