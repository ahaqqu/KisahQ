import { playSfx } from './sfx'

/**
 * Celebration ending: falling stars + confetti burst (CSS keyframes, DOM
 * particles) into the Hikmah screen. Positive-only by design — every story
 * ends in a celebration. Honors prefers-reduced-motion (simple fade).
 */

const STAR_COLORS = ['#e5525e', '#f8d16b', '#7fbf7b', '#c94f76', '#f2a65a']

export function celebrate(container: HTMLElement, onDone: () => void): void {
  const overlay = document.createElement('div')
  overlay.className = 'celebrate'
  overlay.setAttribute('aria-hidden', 'true')

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pieces = reduced ? 0 : 26
  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement('span')
    const star = i % 3 !== 2
    piece.className = star ? 'celebrate__star' : 'celebrate__dot'
    piece.style.left = `${Math.random() * 100}%`
    piece.style.animationDelay = `${Math.random() * 1.6}s`
    piece.style.animationDuration = `${1.8 + Math.random() * 1.6}s`
    piece.style.color = STAR_COLORS[i % STAR_COLORS.length]
    piece.textContent = star ? '✦' : '●'
    overlay.appendChild(piece)
  }
  container.appendChild(overlay)
  playSfx('sparkle')

  const totalMs = reduced ? 400 : 2600
  window.setTimeout(() => {
    overlay.remove()
    onDone()
  }, totalMs)
}
