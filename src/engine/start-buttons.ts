import { localized, t } from '../i18n'
import type { LocalizedText } from '../story/types'

/**
 * Start-screen story buttons (the F2 fix). Every button is two lines — the
 * generic UI label ("Mulai Kisah") above the story's own title — so siblings
 * are visually distinct for toddlers AND carry a distinct accessible name for
 * screen readers (`aria-label` = "<label> — <title>"). Titles are story
 * CONTENT (LocalizedText from the loader's title manifest), not i18n keys;
 * they are picked in the app's current language at render time, and a
 * language switch re-renders the screen like every other localized string.
 *
 * The registry (`REGISTERED_STORIES` + `STORY_TITLES`) is injected by the
 * caller so rendering is testable with synthetic entries (two buttons → two
 * distinct accessible names) without importing the app shell.
 */

export interface StoryButtonEntry {
  slug: string
  title: LocalizedText
}

export function renderStoryButtons(
  container: HTMLElement,
  entries: ReadonlyArray<StoryButtonEntry>,
  onOpen: (slug: string) => void,
): void {
  for (const { slug, title } of entries) {
    const label = t('startButton')
    const storyTitle = localized(title)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'big-button start-button'
    button.dataset.slug = slug
    button.setAttribute('aria-label', `${label} — ${storyTitle}`)

    const labelLine = document.createElement('span')
    labelLine.className = 'start-button__label'
    labelLine.textContent = label
    const titleLine = document.createElement('span')
    titleLine.className = 'start-button__title'
    titleLine.textContent = storyTitle
    button.append(labelLine, titleLine)

    button.addEventListener('click', () => onOpen(slug))
    container.appendChild(button)
  }
}
