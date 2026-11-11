import { getSelectedProvider } from './audio/registry'
import { batikStar, megaMendung } from './art'
import { renderParentGateButton } from './engine/parent-gate'
import { StoryPlayer } from './engine/player'
import { getLang, localized, t } from './i18n'
import { loadStory, REGISTERED_STORIES } from './story/loader'
import type { Story } from './story/types'
import './styles.css'

/**
 * App shell. Screens: start (title + Album Hikmah shelf) → story player →
 * celebration → Hikmah screen (→ start). Language switch re-renders the
 * current screen; the only persisted state is language + album stickers +
 * parent-gate audio settings in localStorage (zero telemetry).
 */

const ALBUM_KEY = 'kisahq.album'

type Screen =
  | { kind: 'start' }
  | { kind: 'hikmah'; story: Story }
  | { kind: 'loading' }

let currentScreen: Screen = { kind: 'start' }
let player: StoryPlayer | undefined

function appRoot(): HTMLElement {
  const root = document.getElementById('app')
  if (!root) throw new Error('#app missing')
  return root
}

function finishedSlugs(): string[] {
  try {
    const raw = localStorage.getItem(ALBUM_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object') return Object.keys(parsed as Record<string, unknown>)
  } catch {
    // Corrupt album storage is not fatal — start from an empty shelf.
  }
  return []
}

function markFinished(slug: string): void {
  try {
    const raw = localStorage.getItem(ALBUM_KEY)
    const album = (raw ? JSON.parse(raw) : {}) as Record<string, boolean>
    album[slug] = true
    localStorage.setItem(ALBUM_KEY, JSON.stringify(album))
  } catch {
    // Best-effort; the sticker re-appears the next time the story finishes.
  }
}

function render(): void {
  player?.destroy()
  player = undefined
  const root = appRoot()
  root.innerHTML = ''
  const screen = document.createElement('main')
  screen.className = 'screen'
  root.appendChild(screen)
  renderParentGateButton(root, { onLangChange: () => render() })

  if (currentScreen.kind === 'start') renderStartScreen(screen)
  else if (currentScreen.kind === 'hikmah') renderHikmahScreen(screen, currentScreen.story)
  else renderLoadingScreen(screen)
}

// ------------------------------------------------------------- start screen

function renderStartScreen(screen: HTMLElement): void {
  screen.innerHTML = `
    <section class="start-screen">
      <div class="start-frame">
        ${megaMendung(600, 22)}
        <h1 class="start-title">${t('startTitle')}</h1>
        <p class="start-subtitle">${t('startSubtitle')}</p>
        <div class="album">
          <h2 class="album__title">${t('albumTitle')}</h2>
          <div class="album__shelf"></div>
        </div>
        <div class="story-list"></div>
      </div>
    </section>
  `

  const shelf = screen.querySelector<HTMLElement>('.album__shelf')
  const finished = finishedSlugs()
  if (shelf) {
    if (finished.length === 0) {
      shelf.innerHTML = `<p class="album__empty">${t('albumEmpty')}</p>`
    } else {
      for (const slug of finished) {
        const sticker = document.createElement('button')
        sticker.type = 'button'
        sticker.className = 'album__sticker'
        sticker.setAttribute('aria-label', `${t('albumStickerAria')} — ${slug}`)
        sticker.innerHTML = batikStar(84)
        sticker.addEventListener('click', () => {
          void openStory(slug, { skipToHikmah: true })
        })
        shelf.appendChild(sticker)
      }
    }
  }

  const storyList = screen.querySelector<HTMLElement>('.story-list')
  for (const slug of REGISTERED_STORIES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'big-button start-button'
    button.textContent = t('startButton')
    button.dataset.slug = slug
    button.addEventListener('click', () => {
      void openStory(slug)
    })
    storyList?.appendChild(button)
  }
}

// ------------------------------------------------------------ story playing

async function openStory(slug: string, options: { skipToHikmah?: boolean } = {}): Promise<void> {
  currentScreen = { kind: 'loading' }
  render()
  try {
    const story = await loadStory(slug)
    if (options.skipToHikmah) {
      currentScreen = { kind: 'hikmah', story }
      render()
      return
    }
    currentScreen = { kind: 'start' }
    const root = appRoot()
    root.innerHTML = ''
    const playArea = document.createElement('main')
    playArea.className = 'screen screen--play'
    root.appendChild(playArea)
    renderParentGateButton(root, { onLangChange: () => render() })
    player = new StoryPlayer(playArea, story, {
      onFinish: () => {
        markFinished(slug)
        currentScreen = { kind: 'hikmah', story }
        render()
      },
    })
    player.start()
  } catch {
    currentScreen = { kind: 'start' }
    render()
    const root = appRoot()
    const error = document.createElement('p')
    error.className = 'load-error'
    error.setAttribute('role', 'alert')
    error.textContent = t('storyNotLoaded')
    root.appendChild(error)
    window.setTimeout(() => error.remove(), 2500)
  }
}

// ------------------------------------------------------------- hikmah screen

function renderHikmahScreen(screen: HTMLElement, story: Story): void {
  screen.innerHTML = `
    <section class="hikmah-screen">
      <div class="hikmah-card">
        ${megaMendung(600, 22)}
        <h1 class="hikmah-title">${t('hikmahTitle')}</h1>
        <p class="hikmah-sentence">${localized(story.hikmah)}</p>
        <div class="hikmah-prompts">
          <h2>${t('hikmahPromptsTitle')}</h2>
          <ul>
            ${story.hikmah.prompts.map((prompt) => `<li>${localized(prompt)}</li>`).join('')}
          </ul>
        </div>
        <div class="hikmah-actions">
          <button type="button" class="big-button hikmah-replay">${t('playAgain')}</button>
          <button type="button" class="big-button hikmah-home">${t('backHome')}</button>
        </div>
      </div>
    </section>
  `
  screen.querySelector<HTMLButtonElement>('.hikmah-replay')?.addEventListener('click', () => {
    void openStory(story.slug)
  })
  screen.querySelector<HTMLButtonElement>('.hikmah-home')?.addEventListener('click', () => {
    currentScreen = { kind: 'start' }
    render()
  })
  // Hikmah sentence is narration-first too.
  const provider = getSelectedProvider()
  if (provider.isConfigured()) {
    void provider.speak({ text: localized(story.hikmah), lang: getLang() })
  }
}

function renderLoadingScreen(screen: HTMLElement): void {
  screen.innerHTML = `<p class="loading">${t('startTitle')}…</p>`
}

render()

export {}
