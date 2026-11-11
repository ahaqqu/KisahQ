import { describe, expect, it } from 'vitest'
import {
  fruitHitGeometry,
  FRUIT_HIT_RADIUS,
  FRUIT_VIEWBOX_ORIGIN_X,
  renderProp,
} from '../src/art/props'

/**
 * Regression pins for the count interaction (thermos C1/D1/D2):
 * - C1: tap targets ≥64px, non-overlapping, inside the viewBox, one
 *   pointer-events hit circle per fruit.
 * - D1: the fruits strip stays clear of the .actors container band (a
 *   full-width box at the stage bottom would swallow taps on the last row
 *   and soft-lock the scene).
 * - D2: the ≥64px guarantee is SCROLLBAR-AWARE — a classic ~15px scrollbar
 *   shrinks the layout width, so the chain
 *   viewport − scrollbar − app chrome → strip width → rendered hit diameter
 *   must hold, not the scrollbar-less estimate.
 */

// CSS chain (thermos D2): 320px viewport − ~15px classic scrollbar = 305px
// layout width − 22px app chrome (16px screen padding + 6px page border) =
// 283px strip.
const SCROLLBAR_PX = 15
const SMALLEST_VIEWPORT_PX = 320
const APP_HORIZONTAL_CHROME_PX = 22
const NARROWEST_STRIP_PX = SMALLEST_VIEWPORT_PX - SCROLLBAR_PX - APP_HORIZONTAL_CHROME_PX // 283
const MIN_TARGET_PX = 64
/** Schema-legal interaction counts (scripts/validate-stories.mjs CountInteraction). */
const SCHEMA_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

// Strip-vs-actors clearance pin (thermos D1): constants mirror src/styles.css
// and the layout assumptions at the smallest reachable stage (book
// min-height 420 − narration bar 96 − page border 6).
const WORST_STAGE_HEIGHT_PX = 318
const ACTORS_BOTTOM_RATIO = 0.06 // .actors { bottom: 6% }
const ACTOR_BAND_HEIGHT_PX = 84 // actor width clamp floor 96px × SVG aspect 140/160
const STRIP_BOTTOM_RATIO = 0.3 // .scenery__fruits { bottom: 30% }
const STRIP_MAX_WIDTH_PX = 460 // .scenery__fruits { width: min(100%, 460px) }
const MIN_CLEARANCE_PX = 4

describe('CSS chain → rendered hit diameter (thermos D2, scrollbar-aware)', () => {
  it('the strip width is what the browser really gives us at 320×568', () => {
    expect(NARROWEST_STRIP_PX).toBe(283)
  })

  it.each(SCHEMA_COUNTS)('count=%i hit circles render ≥64px through the full chain', (count) => {
    const geometry = fruitHitGeometry(count)
    const stripWidth = Math.min(NARROWEST_STRIP_PX, STRIP_MAX_WIDTH_PX)
    const scale = stripWidth / geometry.viewBoxWidth
    expect(2 * geometry.hitRadius * scale).toBeGreaterThanOrEqual(MIN_TARGET_PX)
  })
})

describe('tap targets (thermos C1)', () => {
  it.each(SCHEMA_COUNTS)('count=%i hit circles never overlap each other', (count) => {
    const geometry = fruitHitGeometry(count)
    for (let i = 0; i < geometry.spots.length; i += 1) {
      for (let j = i + 1; j < geometry.spots.length; j += 1) {
        const [x1, y1] = geometry.spots[i]
        const [x2, y2] = geometry.spots[j]
        expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThanOrEqual(2 * FRUIT_HIT_RADIUS)
      }
    }
  })

  it.each(SCHEMA_COUNTS)('count=%i places one spot per fruit inside the viewBox', (count) => {
    const geometry = fruitHitGeometry(count)
    expect(geometry.spots).toHaveLength(count)
    const left = FRUIT_VIEWBOX_ORIGIN_X
    const right = FRUIT_VIEWBOX_ORIGIN_X + geometry.viewBoxWidth
    for (const [x, y] of geometry.spots) {
      expect(x - geometry.hitRadius).toBeGreaterThanOrEqual(left)
      expect(x + geometry.hitRadius).toBeLessThanOrEqual(right)
      expect(y - geometry.hitRadius).toBeGreaterThanOrEqual(0)
      expect(y + geometry.hitRadius).toBeLessThanOrEqual(geometry.viewBoxHeight)
    }
  })

  it('renders one transparent pointer-events hit circle per fruit', () => {
    const svg = renderProp('fruits', { fruits: 5 })
    const hits = svg.match(/class="fruit-hit"/g) ?? []
    expect(hits).toHaveLength(5)
    expect(svg).toContain(`r="${FRUIT_HIT_RADIUS}"`)
    expect(svg).toContain('pointer-events="all"')
    expect((svg.match(/class="count-fruit"/g) ?? []).length).toBe(5)
  })
})

describe('strip-vs-actors clearance (thermos D1: no soft-lock)', () => {
  it.each(SCHEMA_COUNTS)('count=%i lowest hit circle stays above the actors band', (count) => {
    const geometry = fruitHitGeometry(count)
    const stripWidth = Math.min(NARROWEST_STRIP_PX, STRIP_MAX_WIDTH_PX)
    const stripHeight = stripWidth * (geometry.viewBoxHeight / geometry.viewBoxWidth)
    const lowestCircleBottomUnits = Math.max(...geometry.spots.map(([, y]) => y)) + geometry.hitRadius
    const lowestHitPx =
      STRIP_BOTTOM_RATIO * WORST_STAGE_HEIGHT_PX +
      stripHeight * ((geometry.viewBoxHeight - lowestCircleBottomUnits) / geometry.viewBoxHeight)
    const actorsBandTopPx = ACTORS_BOTTOM_RATIO * WORST_STAGE_HEIGHT_PX + ACTOR_BAND_HEIGHT_PX
    expect(lowestHitPx - actorsBandTopPx).toBeGreaterThanOrEqual(MIN_CLEARANCE_PX)
  })
})
