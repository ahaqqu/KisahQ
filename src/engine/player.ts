import { CHARACTERS, isKnownProp, renderBackground, renderProp, type BackgroundKey } from '../art'
import { getSelectedProvider, narrationAvailable } from '../audio/registry'
import { countWord, getLang, localized, t } from '../i18n'
import { playSfx, type Pluck } from './sfx'
import { celebrate } from './celebrate'
import type { Interaction, Scene, Story } from '../story/types'

/**
 * Linear scene player — the book IS the toy:
 * - 3D page-flip (CSS perspective rotateY + curl shadow), swipe OR big arrow,
 *   overswipe-safe (same page stays);
 * - narration-first with karaoke word highlight (browser TTS boundary events,
 *   baked-audio caption windows, interpolated sweep for live HTTP providers);
 * - one interaction per scene step, positive-only feedback, big tap targets;
 * - character idle loops + randomized tap reactions (every animation responds
 *   to a child action or aids narration — no passive auto-fire);
 * - 2–3 layered SVG parallax that drifts with pointer/drag.
 */

const SWIPE_THRESHOLD_PX = 60
const PAGE_FLIP_MS = 700
const TAP_REACTIONS = ['reaction-giggle', 'reaction-spin', 'reaction-bubble'] as const
const REACTION_BUBBLES = ['hihi!', 'hehe!', 'yay!']
const SCENE_STINGERS: Pluck[] = ['pluck1', 'pluck2', 'pluck3']

export interface PlayerCallbacks {
  /** Invoked after the celebration, before the Hikmah screen. */
  onFinish: () => void
}

export class StoryPlayer {
  private readonly root: HTMLElement
  private readonly story: Story
  private readonly callbacks: PlayerCallbacks
  private sceneIndex = 0
  private sceneDone = false
  private flipping = false
  private karaokeWords: HTMLElement[] = []
  private activeAudio: HTMLAudioElement | undefined
  private silentNoticeShown = false
  private hintShownForScene = false
  private narrationLineId = 0

  constructor(root: HTMLElement, story: Story, callbacks: PlayerCallbacks) {
    this.root = root
    this.story = story
    this.callbacks = callbacks
  }

  start(): void {
    this.root.innerHTML = ''
    const shell = document.createElement('div')
    shell.className = 'player'
    shell.innerHTML = `
      <div class="book">
        <div class="stage-slot"></div>
      </div>
      <div class="hud">
        <button type="button" class="next-btn hidden" aria-label="${t('next')}">
          <span aria-hidden="true">▶</span> ${t('next')}
        </button>
        <div class="progress-dots" aria-hidden="true"></div>
      </div>
    `
    this.root.appendChild(shell)
    shell.querySelector<HTMLButtonElement>('.next-btn')?.addEventListener('click', () => {
      if (this.sceneDone && !this.flipping) this.advance()
    })
    this.renderScene()
  }

  destroy(): void {
    this.cancelAudio()
    this.root.innerHTML = ''
  }

  // ---------------------------------------------------------------- scene

  private currentScene(): Scene {
    return this.story.scenes[this.sceneIndex]
  }

  private renderScene(): void {
    const scene = this.currentScene()
    this.sceneDone = false
    this.hintShownForScene = false
    // The next button is shared across scenes (it lives in the hud): re-hide
    // it so "Lanjut" only appears after THIS scene's interaction completes.
    this.root.querySelector<HTMLButtonElement>('.next-btn')?.classList.add('hidden')

    const slot = this.root.querySelector<HTMLElement>('.stage-slot')
    if (!slot) return

    const page = document.createElement('div')
    page.className = 'page'
    page.innerHTML = `
      <div class="stage" tabindex="0" aria-label="${localized(scene.narration)}">
        <div class="parallax"></div>
        <div class="scenery"></div>
      </div>
      <div class="narration-bar">
        <button type="button" class="replay-btn" aria-label="${t('narrationReplay')}">
          <span aria-hidden="true">🔊</span>
        </button>
        <p class="karaoke" aria-live="polite"></p>
      </div>
    `
    slot.appendChild(page)

    const stage = page.querySelector<HTMLElement>('.stage')
    if (!stage) return
    stage.focus({ preventScroll: true })

    this.renderBackgroundLayers(page.querySelector<HTMLElement>('.parallax'), scene.bg)
    this.renderScenery(page.querySelector<HTMLElement>('.scenery'), scene)
    this.renderNarration(page, scene)
    this.updateProgressDots()
    this.bindPageGestures(stage)
    this.bindInteraction(stage, page, scene)
    if (scene.sfx) playSfx(scene.sfx)
    else playSfx(SCENE_STINGERS[this.sceneIndex % SCENE_STINGERS.length])

    // Tap anywhere on the narration bar replays the line (no-reading-required).
    page.querySelector<HTMLElement>('.narration-bar')?.addEventListener('click', () => {
      this.speakNarration(page, scene)
    })

    this.flipPageIn(page)
    this.speakNarration(page, scene)
  }

  private renderBackgroundLayers(container: HTMLElement | null, bg: string): void {
    if (!container) return
    container.innerHTML = ''
    for (const layer of renderBackground(bg as BackgroundKey)) {
      const div = document.createElement('div')
      div.className = layer.className
      div.innerHTML = layer.svg
      container.appendChild(div)
    }
    this.bindParallax(container)
  }

  private renderScenery(scenery: HTMLElement | null, scene: Scene): void {
    if (!scenery) return
    scenery.innerHTML = ''

    for (const prop of ['tree', 'basket', 'water', 'fruits'] as const) {
      const interaction = scene.interactions.find(
        (entry) => isKnownProp(entry.target) && entry.target === prop,
      )
      if (!interaction) continue
      const count = interaction.type === 'count' ? interaction.count : undefined
      const div = document.createElement('div')
      div.className = `prop scenery__${prop}`
      div.dataset.prop = prop
      div.dataset.target = prop
      div.innerHTML = renderProp(prop, { fruits: count })
      scenery.appendChild(div)
    }

    const actorsRow = document.createElement('div')
    actorsRow.className = 'actors'
    for (const actor of scene.actors) {
      const def = CHARACTERS[actor.character]
      if (!def) continue
      const wrapper = document.createElement('div')
      wrapper.className = 'actor'
      wrapper.dataset.character = actor.character
      wrapper.dataset.target = actor.character
      wrapper.innerHTML = `
        <div class="actor__idle char-idle-${actor.character}">
          ${def.render(actor.pose)}
        </div>
      `
      actorsRow.appendChild(wrapper)
    }
    scenery.appendChild(actorsRow)
  }

  private renderNarration(page: HTMLElement, scene: Scene): void {
    const karaoke = page.querySelector<HTMLElement>('.karaoke')
    if (!karaoke) return
    const words = localized(scene.narration).split(/\s+/)
    karaoke.innerHTML = ''
    this.karaokeWords = words.map((word, index) => {
      const span = document.createElement('span')
      span.className = 'karaoke__word'
      span.textContent = word
      span.dataset.wordIndex = String(index)
      karaoke.appendChild(span)
      karaoke.appendChild(document.createTextNode(' '))
      return span
    })
  }

  private updateProgressDots(): void {
    const dots = this.root.querySelector<HTMLElement>('.progress-dots')
    if (!dots) return
    dots.innerHTML = this.story.scenes
      .map((_, index) => `<span class="dot${index === this.sceneIndex ? ' dot--active' : ''}${index < this.sceneIndex ? ' dot--done' : ''}"></span>`)
      .join('')
  }

  // ------------------------------------------------------------ narration

  private cancelAudio(): void {
    getSelectedProvider().cancel()
    if (this.activeAudio) {
      this.activeAudio.pause()
      this.activeAudio = undefined
    }
    this.narrationLineId += 1
  }

  private async speakNarration(page: HTMLElement, scene: Scene): Promise<void> {
    this.cancelAudio()
    const lineId = this.narrationLineId

    if (scene.audio?.mode === 'baked') {
      const played = await this.tryPlayBaked(scene, lineId)
      if (played || lineId !== this.narrationLineId) return
    }

    const provider = getSelectedProvider()
    if (!provider.isConfigured() || !narrationAvailable()) {
      this.showSilentNotice(page)
      return
    }

    const swept = provider.id !== 'browser'
    if (swept) this.sweepHighlight(lineId)
    await provider.speak({
      text: localized(scene.narration),
      lang: getLang(),
      onWord: provider.id === 'browser' ? (wordIndex) => this.highlightWord(lineId, wordIndex) : undefined,
      onEnd: () => {},
      onError: () => this.showSilentNotice(page),
    })
  }

  /** Baked audio wins over live TTS; try the current language, then id-ID. */
  private async tryPlayBaked(scene: Scene, lineId: number): Promise<boolean> {
    for (const lang of [getLang(), 'id'] as const) {
      const played = await this.playBakedOnce(scene, lang, lineId)
      if (played) return true
    }
    return false
  }

  private playBakedOnce(scene: Scene, lang: 'id' | 'en', lineId: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const audio = new Audio(`stories/${this.story.slug}/audio/${lang}/${scene.id}.mp3`)
      let settled = false
      const done = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      // If it cannot start within 1.5s, fall through to the TTS provider.
      window.setTimeout(() => {
        if (!settled) audio.pause()
        done(false)
      }, 1500)
      audio.onerror = () => done(false)
      audio.onplaying = () => {
        this.activeAudio = audio
        const window_ = this.captionWindow(scene)
        const wordCount = this.karaokeWords.length
        if (wordCount > 0 && window_) {
          audio.ontimeupdate = () => {
            if (lineId !== this.narrationLineId) return
            const progress = Math.min(
              1,
              Math.max(0, (audio.currentTime - window_.tStart) / Math.max(0.1, window_.tEnd - window_.tStart)),
            )
            this.highlightWord(lineId, Math.floor(progress * (wordCount - 1)))
          }
        }
        done(true)
      }
      void audio.play().catch(() => done(false))
    })
  }

  private captionWindow(scene: Scene): { tStart: number; tEnd: number } | undefined {
    const captions = scene.audio?.captions ?? []
    const lang = getLang()
    const caption =
      captions.find((entry) => entry.line === scene.id && entry.lang === lang) ??
      captions.find((entry) => entry.line === scene.id)
    if (!caption) return undefined
    return { tStart: caption.tStart, tEnd: caption.tEnd }
  }

  private highlightWord(lineId: number, index: number): void {
    if (lineId !== this.narrationLineId) return
    this.karaokeWords.forEach((word, i) => {
      word.classList.toggle('karaoke__word--active', i === index)
    })
  }

  private sweepHighlight(lineId: number): void {
    const words = this.karaokeWords.length
    if (words === 0) return
    for (let i = 0; i < words; i += 1) {
      window.setTimeout(() => this.highlightWord(lineId, i), i * 340)
    }
  }

  private showSilentNotice(page: HTMLElement): void {
    if (this.silentNoticeShown) return
    this.silentNoticeShown = true
    const notice = document.createElement('p')
    notice.className = 'narration-notice'
    notice.textContent = t('narrationUnavailable')
    page.querySelector('.narration-bar')?.appendChild(notice)
  }

  // ---------------------------------------------------------- interaction

  private bindInteraction(stage: HTMLElement, page: HTMLElement, scene: Scene): void {
    const interaction = scene.interactions[0]
    if (!interaction) return
    if (interaction.type === 'count') {
      this.bindCountInteraction(stage, page, interaction)
    } else {
      this.bindTapInteraction(stage, page, interaction)
    }
    this.bindTapReactions(stage)
  }

  private bindTapInteraction(stage: HTMLElement, page: HTMLElement, interaction: Extract<Interaction, { type: 'tap' }>): void {
    stage.addEventListener('click', (event) => {
      if (this.sceneDone || this.flipping) return
      // Element, not HTMLElement: interaction targets include SVG groups
      // (the count fruits) — an HTMLElement check rejects every SVG tap.
      const element = (event.target as Element).closest('[data-target]')
      if (element && (element as HTMLElement).dataset.target === interaction.target) {
        this.completeInteraction(page, () => this.showPraise(page, interaction.praise))
      } else if (!this.hintShownForScene) {
        this.hintShownForScene = true
        this.showHint(page)
      }
    })
    this.markTargetGlow(stage, interaction.target)
  }

  private bindCountInteraction(stage: HTMLElement, page: HTMLElement, interaction: Extract<Interaction, { type: 'count' }>): void {
    let tapped = 0
    stage.addEventListener('click', (event) => {
      if (this.sceneDone || this.flipping) return
      // Element, not HTMLElement: .count-fruit groups are SVG elements, and
      // an HTMLElement check rejected every real fruit tap (the D1 lock).
      const fruit = (event.target as Element).closest('.count-fruit:not(.count-fruit--collected)')
      if (!(fruit instanceof Element)) {
        if (!this.hintShownForScene) {
          this.hintShownForScene = true
          this.showHint(page)
        }
        return
      }
      fruit.classList.add('count-fruit--collected')
      tapped += 1
      playSfx('pop')
      this.speakCountWord(tapped)
      // Quiet short bubble: the numeral word, no extra TTS (countWord is spoken below).
      this.showPraise(page, { id: countWord(tapped), en: countWord(tapped) }, { quiet: true, short: true })
      if (tapped >= interaction.count) {
        this.completeInteraction(page, () => this.showPraise(page, interaction.praise))
      }
    })
    this.markTargetGlow(stage, interaction.target)
  }

  private speakCountWord(n: number): void {
    const provider = getSelectedProvider()
    if (!provider.isConfigured() || !narrationAvailable()) return
    void provider.speak({ text: countWord(n), lang: getLang() })
  }

  /** Tap reactions: 2–3 randomized responses per character tap — every tap answers back. */
  private bindTapReactions(stage: HTMLElement): void {
    stage.addEventListener('click', (event) => {
      const actor = (event.target as HTMLElement).closest('.actor')
      if (!(actor instanceof HTMLElement) || this.flipping) return
      const reaction = TAP_REACTIONS[Math.floor(Math.random() * TAP_REACTIONS.length)]
      actor.classList.remove(...TAP_REACTIONS)
      void actor.offsetWidth // restart the animation
      actor.classList.add(reaction)
      if (reaction === 'reaction-bubble') {
        const bubble = document.createElement('span')
        bubble.className = 'actor__bubble'
        bubble.textContent = REACTION_BUBBLES[Math.floor(Math.random() * REACTION_BUBBLES.length)]
        actor.appendChild(bubble)
        window.setTimeout(() => bubble.remove(), 1100)
      }
      playSfx('pop')
      window.setTimeout(() => actor.classList.remove(reaction), 900)
    })
  }

  private markTargetGlow(stage: HTMLElement, target: string): void {
    const element = stage.querySelector<HTMLElement>(`[data-target="${CSS.escape(target)}"]`)
    element?.classList.add('target-glow')
  }

  private completeInteraction(page: HTMLElement, finish: () => void): void {
    this.sceneDone = true
    finish()
    const next = this.root.querySelector<HTMLButtonElement>('.next-btn')
    next?.classList.remove('hidden')
    next?.focus({ preventScroll: true })
    page.querySelector('.narration-bar')?.classList.add('narration-bar--done')
  }

  private showPraise(page: HTMLElement, praise: { id: string; en: string }, options: { quiet?: boolean; short?: boolean } = {}): void {
    const bubble = document.createElement('div')
    bubble.className = options.short ? 'praise praise--short' : 'praise'
    bubble.textContent = options.quiet ? praise.id : localized(praise)
    page.querySelector('.stage')?.appendChild(bubble)
    window.setTimeout(() => bubble.remove(), options.short ? 900 : 1600)
    if (!options.quiet) {
      const provider = getSelectedProvider()
      if (provider.isConfigured() && narrationAvailable()) {
        void provider.speak({ text: localized(praise), lang: getLang() })
      }
    }
  }

  private showHint(page: HTMLElement): void {
    const bubble = document.createElement('div')
    bubble.className = 'hint-bubble'
    bubble.textContent = t('tapHint')
    page.querySelector('.stage')?.appendChild(bubble)
    const target = page.querySelector('.target-glow')
    target?.classList.add('target-glow--strong')
    window.setTimeout(() => {
      bubble.remove()
      target?.classList.remove('target-glow--strong')
    }, 1500)
  }

  // ------------------------------------------------------- page gestures

  private bindPageGestures(stage: HTMLElement): void {
    let startX = 0
    stage.addEventListener('pointerdown', (event) => {
      startX = event.clientX
    })
    stage.addEventListener('pointerup', (event) => {
      const delta = event.clientX - startX
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return // overswipe-safe: same page stays
      if (delta < 0 && this.sceneDone && !this.flipping) this.advance()
    })
    stage.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' && this.sceneDone && !this.flipping) {
        this.advance()
      } else if (event.key === 'ArrowLeft' && this.sceneIndex > 0 && !this.flipping) {
        this.sceneIndex -= 1
        this.advance(true)
      }
    })
  }

  /** Parallax: background layers drift with pointer/drag — child-caused, not auto-fire. */
  private bindParallax(container: HTMLElement): void {
    const stage = container.closest<HTMLElement>('.stage')
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const layers = container.querySelectorAll<HTMLElement>('.bg-layer')
    const shift = (x: number) => {
      const ratio = Math.max(-1, Math.min(1, x)) // -1..1
      layers.forEach((layer, index) => {
        const depth = (index + 1) * 7
        layer.style.transform = `translateX(${(-ratio * depth).toFixed(1)}px)`
      })
    }
    stage.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect()
      shift(((event.clientX - rect.left) / rect.width) * 2 - 1)
    })
    stage.addEventListener('pointerleave', () => shift(0))
  }

  private advance(backwards = false): void {
    if (!backwards && this.sceneIndex >= this.story.scenes.length - 1) {
      this.finishStory()
      return
    }
    if (!backwards) this.sceneIndex += 1
    playSfx('whoosh')
    this.renderScene()
  }

  private flipPageIn(page: HTMLElement): void {
    const book = this.root.querySelector<HTMLElement>('.book')
    const previous = book ? Array.from(book.querySelectorAll('.page')) : []
    for (const old of previous) {
      if (old === page) continue
      this.animateFlipOut(old as HTMLElement)
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    page.classList.add('page--flip-in')
    window.setTimeout(() => page.classList.remove('page--flip-in'), PAGE_FLIP_MS)
  }

  private animateFlipOut(old: HTMLElement): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      old.remove()
      return
    }
    this.flipping = true
    old.classList.add('page--flip-out')
    window.setTimeout(() => {
      old.remove()
      this.flipping = false
    }, PAGE_FLIP_MS)
  }

  private finishStory(): void {
    this.cancelAudio()
    celebrate(this.root.querySelector<HTMLElement>('.player') ?? this.root, () => {
      this.callbacks.onFinish()
    })
  }
}
