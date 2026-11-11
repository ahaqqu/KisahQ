import { describe, expect, it } from 'vitest'
import { fruitHitGeometry, FRUIT_HIT_RADIUS, renderProp } from '../src/art/props'

/**
 * Regression pin for the ≥64px tap-target non-negotiable (thermos C1): the
 * count interaction is Story 1's centerpiece — its targets must never render
 * below the threshold again, and the oversized hit circles must stay
 * non-overlapping and inside the SVG viewBox for every schema-legal count.
 */

/** Narrowest supported stage strip: 320px viewport − 16px screen padding − 6px page border. */
const NARROWEST_STRIP_PX = 298
const MIN_TARGET_PX = 64
/** Schema-legal interaction counts (scripts/validate-stories.mjs CountInteraction). */
const SCHEMA_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

describe('count-interaction tap targets (≥64px, thermos C1)', () => {
  it.each(SCHEMA_COUNTS)('count=%i renders ≥64px hit circles on the narrowest stage', (count) => {
    const geometry = fruitHitGeometry(count)
    const scale = NARROWEST_STRIP_PX / geometry.viewBoxWidth
    const hitDiameterPx = 2 * geometry.hitRadius * scale
    expect(hitDiameterPx).toBeGreaterThanOrEqual(MIN_TARGET_PX)
  })

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
    for (const [x, y] of geometry.spots) {
      expect(x - geometry.hitRadius).toBeGreaterThanOrEqual(0)
      expect(x + geometry.hitRadius).toBeLessThanOrEqual(geometry.viewBoxWidth)
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
