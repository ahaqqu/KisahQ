import type { Pose } from '../story/types'

/**
 * Hand-coded flat character art (no external assets). Big shapes, pastel
 * colors, big friendly eyes. Poses are transforms on SVG subgroups; idle
 * loops (blink/breathe/bob) are CSS keyframes driven by classes on the
 * wrapper — animation only runs as ambient support for narration
 * (see the creative-presentation research rule).
 */

export interface CharacterDef {
  name: string
  render: (pose: Pose) => string
}

function eyes(cx1: number, cx2: number, cy: number): string {
  return `<g class="char-eyes">
    <circle cx="${cx1}" cy="${cy}" r="5" fill="#46352b"/>
    <circle cx="${cx2}" cy="${cy}" r="5" fill="#46352b"/>
    <circle cx="${cx1 + 1.6}" cy="${cy - 1.6}" r="1.6" fill="#ffffff"/>
    <circle cx="${cx2 + 1.6}" cy="${cy - 1.6}" r="1.6" fill="#ffffff"/>
  </g>`
}

function poseTransform(pose: Pose, kind: 'full' | 'arm'): string {
  if (kind === 'arm' && pose === 'wave') return 'transform="rotate(-30 0 0)"'
  if (kind === 'full') {
    if (pose === 'jump') return 'transform="translate(0,-14)"'
    if (pose === 'happy') return 'transform="translate(0,-4)"'
  }
  return ''
}

export const CHARACTERS: Record<string, CharacterDef> = {
  toto: {
    name: 'Toto si Kura-kura',
    render: (pose) => `<svg viewBox="0 0 160 140" aria-hidden="true">
      <ellipse cx="80" cy="132" rx="52" ry="7" fill="#00000022"/>
      <g ${poseTransform(pose, 'full')}>
        <path d="M30 96 Q 30 46 80 46 Q 130 46 130 96 Z" fill="#6da85e"/>
        <path d="M44 96 Q 44 58 80 58 Q 116 58 116 96 Z" fill="#8bc47a"/>
        <circle cx="62" cy="78" r="5" fill="#5c9a4e"/>
        <circle cx="98" cy="78" r="5" fill="#5c9a4e"/>
        <circle cx="80" cy="60" r="5" fill="#5c9a4e"/>
        <g transform="translate(96,96)">
          <circle cx="0" cy="-8" r="20" fill="#a5d18f"/>
          ${eyes(-2, 12, -12)}
          <path d="M2 2 Q 8 8 14 2" stroke="#46352b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <circle cx="-8" cy="-2" r="4" fill="#e5a3a3"/>
          <circle cx="16" cy="-2" r="4" fill="#e5a3a3"/>
        </g>
        <rect x="46" y="100" width="24" height="18" rx="6" fill="#a5d18f"/>
        <rect x="92" y="100" width="24" height="18" rx="6" fill="#a5d18f"/>
        <!-- sarung accent: batik-patterned band on the shell -->
        <rect x="40" y="92" width="80" height="8" rx="4" fill="#c94f76" opacity="0.85"/>
      </g>
    </svg>`,
  },
  lili: {
    name: 'Lili si Kelinci',
    render: (pose) => `<svg viewBox="0 0 160 140" aria-hidden="true">
      <ellipse cx="80" cy="132" rx="46" ry="7" fill="#00000022"/>
      <g ${poseTransform(pose, 'full')}>
        <g transform="translate(58,34) ${pose === 'wave' ? 'rotate(-14)' : ''}">
          <ellipse cx="0" cy="0" rx="10" ry="30" fill="#f7f3ee"/>
          <ellipse cx="0" cy="0" rx="4.5" ry="22" fill="#f5b8c4"/>
        </g>
        <g transform="translate(92,34) ${pose === 'wave' ? 'rotate(14)' : ''}">
          <ellipse cx="0" cy="0" rx="10" ry="30" fill="#f7f3ee"/>
          <ellipse cx="0" cy="0" rx="4.5" ry="22" fill="#f5b8c4"/>
        </g>
        <circle cx="80" cy="86" r="34" fill="#f7f3ee"/>
        <g transform="translate(104,92)">
          <g class="char-arm" ${poseTransform(pose, 'arm')}>
            <ellipse cx="0" cy="0" rx="7" ry="14" fill="#f7f3ee" transform="rotate(30)"/>
          </g>
        </g>
        ${eyes(68, 94, 80)}
        <ellipse cx="81" cy="92" rx="4" ry="3" fill="#e58a94"/>
        <path d="M72 100 Q 80 108 88 100" stroke="#c9b8ae" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="58" cy="94" r="6" fill="#f5b8c4" opacity="0.7"/>
        <circle cx="104" cy="94" r="6" fill="#f5b8c4" opacity="0.7"/>
        <ellipse cx="80" cy="118" rx="22" ry="12" fill="#ffffff"/>
      </g>
    </svg>`,
  },
  nana: {
    name: 'Nana si Burung Hantu',
    render: (pose) => `<svg viewBox="0 0 160 140" aria-hidden="true">
      <ellipse cx="80" cy="132" rx="44" ry="7" fill="#00000022"/>
      <g ${poseTransform(pose, 'full')}>
        <ellipse cx="80" cy="92" rx="40" ry="42" fill="#b98a6e"/>
        <path d="M46 60 Q 60 48 72 58" stroke="#8a6148" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M114 60 Q 100 48 88 58" stroke="#8a6148" stroke-width="6" fill="none" stroke-linecap="round"/>
        <ellipse cx="80" cy="106" rx="26" ry="24" fill="#f2e3cf"/>
        <path d="M60 100 h40 M62 108 h36 M64 116 h32" stroke="#e0c9a8" stroke-width="2.5"/>
        ${eyes(64, 96, 80)}
        <path d="M76 90 L 84 90 L 80 98 Z" fill="#e5a33b"/>
        <!-- batik headscarf accent -->
        <path d="M44 66 Q 80 42 116 66 Q 80 56 44 66" fill="#2d5a7b" opacity="0.85"/>
        <path d="M50 64 Q 80 46 110 64" stroke="#5e8fb5" stroke-width="2" fill="none" stroke-dasharray="5 4"/>
      </g>
    </svg>`,
  },
  momo: {
    name: 'Momo si Siput',
    render: (pose) => `<svg viewBox="0 0 160 140" aria-hidden="true">
      <ellipse cx="80" cy="132" rx="40" ry="6" fill="#00000022"/>
      <g ${poseTransform(pose, 'full')}>
        <g class="char-bob">
          <path d="M60 116 Q 78 100 96 116" stroke="#d9c9a8" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M52 60 Q 48 116 116 116 Q 112 92 96 84" fill="none" stroke="#d9c9a8" stroke-width="5" stroke-linecap="round"/>
          <circle cx="72" cy="76" r="26" fill="#e8a25d"/>
          <path d="M72 58 Q 92 60 92 78 Q 90 94 72 94 Q 58 92 58 78 Q 60 62 72 58 Z" fill="#f2c48d"/>
          <path d="M72 66 Q 84 68 84 80 Q 82 88 72 88 Q 66 86 66 78 Q 68 68 72 66 Z" fill="#d98f42"/>
          <g transform="translate(104,102)">
            <circle cx="0" cy="-4" r="13" fill="#f2d8b8"/>
            ${eyes(-2, 8, -8)}
            <path d="M0 2 Q 4 5 8 2" stroke="#46352b" stroke-width="2" fill="none" stroke-linecap="round"/>
            <line x1="-6" y1="-16" x2="-9" y2="-24" stroke="#f2d8b8" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="6" y1="-16" x2="9" y2="-24" stroke="#f2d8b8" stroke-width="3.5" stroke-linecap="round"/>
            <circle cx="-9" cy="-25" r="2.6" fill="#46352b"/>
            <circle cx="9" cy="-25" r="2.6" fill="#46352b"/>
          </g>
        </g>
      </g>
    </svg>`,
  },
}
