/**
 * Engine-known props (validator: interaction targets may reference these ids
 * — keep in sync with KNOWN_PROPS in scripts/validate-stories.mjs).
 */

export const KNOWN_PROPS = ['tree', 'basket', 'fruits', 'water'] as const

export type PropId = (typeof KNOWN_PROPS)[number]

export function isKnownProp(id: string): id is PropId {
  return (KNOWN_PROPS as readonly string[]).includes(id)
}

export function renderProp(id: PropId, options: { fruits?: number } = {}): string {
  switch (id) {
    case 'tree':
      return rambutanTree()
    case 'basket':
      return basket()
    case 'fruits':
      return groundFruits(options.fruits ?? 5)
    case 'water':
      return waterPitcher()
  }
}

function rambutan(): string {
  return `<g class="rambutan-fruit">
    <circle cx="0" cy="0" r="9" fill="#e5525e"/>
    <path d="M-3 -8 Q -6 -13 -3 -15 M0 -9 Q 0 -15 1 -16 M3 -8 Q 6 -13 4 -15" stroke="#7fbf7b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-3" cy="-3" r="2.4" fill="#f0838d"/>
  </g>`
}

function rambutanTree(): string {
  const clusters: Array<[number, number]> = [
    [150, 150], [210, 120], [280, 155], [340, 118], [400, 150],
    [180, 195], [255, 195], [330, 198], [395, 192],
  ]
  return `<svg viewBox="0 0 480 420" aria-hidden="true" class="prop-tree-svg">
    <ellipse cx="240" cy="400" rx="150" ry="16" fill="#00000018"/>
    <rect x="216" y="230" width="48" height="170" rx="14" fill="#a9746b"/>
    <path d="M240 260 L 190 200 M240 250 L 292 196" stroke="#8a5a52" stroke-width="9" stroke-linecap="round"/>
    <g class="tree-canopy">
      <circle cx="240" cy="140" r="98" fill="#7fbf7b"/>
      <circle cx="150" cy="180" r="72" fill="#8fc27c"/>
      <circle cx="330" cy="180" r="72" fill="#8fc27c"/>
      <circle cx="240" cy="120" r="80" fill="#a3cf92"/>
      ${clusters.map(([x, y]) => `<g transform="translate(${x},${y})">${rambutan()}</g>`).join('')}
    </g>
  </svg>`
}

function basket(): string {
  return `<svg viewBox="0 0 160 110" aria-hidden="true" class="prop-basket-svg">
    <ellipse cx="80" cy="100" rx="58" ry="8" fill="#00000018"/>
    <path d="M28 44 Q 80 84 132 44 L 120 96 Q 80 112 40 96 Z" fill="#c68f5a"/>
    <path d="M34 52 Q 80 88 126 52" stroke="#a9744b" stroke-width="3" fill="none"/>
    <path d="M44 60 L 50 96 M64 68 L 68 102 M80 70 L 80 104 M96 68 L 92 102 M116 60 L 110 96" stroke="#a9744b" stroke-width="2.5"/>
    <path d="M40 46 Q 80 10 120 46" stroke="#a9744b" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- batik band on the basket -->
    <path d="M42 78 Q 80 100 118 78" stroke="#c94f76" stroke-width="4" fill="none" stroke-dasharray="8 5"/>
    <g transform="translate(62,44)">${rambutan()}</g>
    <g transform="translate(86,40)">${rambutan()}</g>
    <g transform="translate(100,50)">${rambutan()}</g>
  </svg>`
}

function groundFruits(count: number): string {
  const spots: Array<[number, number]> = [
    [24, 78], [56, 90], [92, 74], [124, 92], [156, 80],
    [40, 62], [110, 60], [144, 64], [72, 58], [132, 78],
  ]
  const items = spots.slice(0, count)
  return `<svg viewBox="0 0 180 110" aria-hidden="true" class="prop-fruits-svg" data-fruit-total="${count}">
    ${items
      .map(([x, y], i) => `<g class="count-fruit" data-fruit-index="${i}" transform="translate(${x},${y})">${rambutan()}</g>`)
      .join('')}
  </svg>`
}

function waterPitcher(): string {
  return `<svg viewBox="0 0 140 130" aria-hidden="true" class="prop-water-svg">
    <ellipse cx="70" cy="120" rx="46" ry="7" fill="#00000018"/>
    <path d="M46 44 Q 44 108 70 108 Q 96 108 94 44 Q 70 56 46 44 Z" fill="#7ea9c7"/>
    <path d="M46 44 Q 70 32 94 44" stroke="#5e8fb5" stroke-width="4" fill="none"/>
    <path d="M94 52 Q 116 58 110 80 Q 106 92 92 90" stroke="#7ea9c7" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M52 40 Q 70 14 88 40" stroke="#5e8fb5" stroke-width="4" fill="none"/>
    <g class="water-drop" opacity="0.9">
      <path d="M92 96 q 5 8 0 13 q -5 -5 0 -13" fill="#9cc8e6"/>
    </g>
  </svg>`
}
