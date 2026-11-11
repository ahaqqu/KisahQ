import { renderQilaEzraBackground, type QilaEzraBackgroundKey } from './qila-ezra'

/**
 * Backgrounds as layered inline SVG for parallax (2–3 layers that drift with
 * pointer/drag). Nusantara settings per the design language: kampung house,
 * sawah paddies, rambutan tree, warm pastel palette.
 *
 * Story-specific backgrounds live in their own modules and are dispatched by
 * key below — Story 2's Bold Flat Pop rooms (kamar-ezra / ruang-tamu)
 * delegate to src/art/qila-ezra.ts.
 */

export type BackgroundKey = 'orchard' | QilaEzraBackgroundKey

interface Layer {
  className: string
  svg: string
}

/** Layered background. layer 1 = far (sky), 2 = mid (kampung), 3 = near (ground). */
export function renderBackground(key: BackgroundKey): Layer[] {
  if (key === 'kamar-ezra' || key === 'ruang-tamu') return renderQilaEzraBackground(key)
  return orchardLayers()
}

function orchardLayers(): Layer[] {
  return [
    { className: 'bg-layer bg-layer--far', svg: orchardFar() },
    { className: 'bg-layer bg-layer--mid', svg: orchardMid() },
    { className: 'bg-layer bg-layer--near', svg: orchardNear() },
  ]
}

function orchardFar(): string {
  return `<svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="800" height="300" fill="#cfe8f2"/>
    <g class="bg-sun">
      <circle cx="640" cy="70" r="34" fill="#f8d16b"/>
      <circle cx="640" cy="70" r="46" fill="#f8d16b" opacity="0.3"/>
    </g>
    <ellipse cx="140" cy="130" rx="70" ry="22" fill="#ffffff" opacity="0.8"/>
    <ellipse cx="330" cy="90" rx="56" ry="18" fill="#ffffff" opacity="0.7"/>
    <path d="M0 240 Q 200 170 420 235 T 800 225 L 800 300 L 0 300 Z" fill="#b7d9a8"/>
    <path d="M0 262 Q 260 210 520 258 T 800 252 L 800 300 L 0 300 Z" fill="#a3cf92"/>
  </svg>`
}

function orchardMid(): string {
  return `<svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <!-- kampung house -->
    <g transform="translate(80,110)">
      <rect x="0" y="52" width="150" height="80" rx="6" fill="#e9c8a0"/>
      <path d="M-12 56 L 75 0 L 162 56 Z" fill="#c94f76"/>
      <rect x="58" y="84" width="34" height="48" rx="4" fill="#a9746b"/>
      <rect x="108" y="66" width="26" height="26" rx="3" fill="#f8e8c8" stroke="#a9746b" stroke-width="2"/>
      <rect x="16" y="66" width="26" height="26" rx="3" fill="#f8e8c8" stroke="#a9746b" stroke-width="2"/>
    </g>
    <!-- sawah paddies -->
    <g transform="translate(430,170)">
      <rect x="0" y="30" width="340" height="46" rx="10" fill="#9cc98a"/>
      <path d="M20 40 h300" stroke="#e3f0d8" stroke-width="3" stroke-dasharray="10 8"/>
      <path d="M20 60 h300" stroke="#e3f0d8" stroke-width="3" stroke-dasharray="10 8"/>
      ${paddySprigs(30, 34)}
      ${paddySprigs(90, 52)}
      ${paddySprigs(150, 34)}
      ${paddySprigs(210, 52)}
      ${paddySprigs(270, 34)}
    </g>
    <!-- bushes -->
    <circle cx="350" cy="220" r="26" fill="#8abf78"/>
    <circle cx="378" cy="226" r="20" fill="#79b168"/>
  </svg>`
}

function paddySprigs(x: number, y: number): string {
  return `<g transform="translate(${x},${y})" fill="#5f9e4d">
    <path d="M0 12 C -2 4 -6 0 -9 -2" stroke="#5f9e4d" stroke-width="2.5" fill="none"/>
    <path d="M0 12 C 0 3 0 -2 0 -5" stroke="#5f9e4d" stroke-width="2.5" fill="none"/>
    <path d="M0 12 C 2 4 6 0 9 -2" stroke="#5f9e4d" stroke-width="2.5" fill="none"/>
  </g>`
}

function orchardNear(): string {
  return `<svg viewBox="0 0 800 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="800" height="140" fill="#8fc27c"/>
    <path d="M0 30 Q 200 12 400 30 T 800 26 L 800 60 Q 400 46 0 60 Z" fill="#7fbf7b" opacity="0.8"/>
    <ellipse cx="120" cy="120" rx="46" ry="12" fill="#79b168"/>
    <ellipse cx="620" cy="126" rx="56" ry="14" fill="#79b168"/>
    <circle cx="710" cy="110" r="18" fill="#a3cf92"/>
    <circle cx="734" cy="116" r="13" fill="#8abf78"/>
  </svg>`
}
