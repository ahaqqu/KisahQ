import type { Pose } from '../story/types'
import type { CharacterDef } from './characters'

/**
 * Personal-cast character sheets + scene art for Story 2 ("Qila dan Ezra:
 * Truk Ezra Hilang!") in the 03 Bold Flat Pop direction (manager's pick,
 * 2026-11-12): thick 3.5-4px ink outlines on every shape, saturated coral /
 * teal / sunflower fills, hard offset shadows, big glint eyes, star-dot
 * confetti motif. Canon overrides baked in:
 *   - Qila wears the HIJAB in every render (bold-flat hood silhouette — the
 *     mockup's no-hijab exploration stays in the gallery, it is not canon).
 *   - Ezra's LESUNG PIPIT (dimples) are drawn in EVERY render as bold cheek
 *     dots with cream highlight arcs, readable from afar.
 *
 * NEW-MODULE NOTE (stacked-PR constraint): the base PR (feat/app-shell) is
 * mid-fix-round, so this module only IMPORTS from the engine and does not
 * touch any existing file. Follow-up wiring PR (engine) should:
 *   1. Merge `QILA_EZRA_CHARACTERS` into `CHARACTERS` (src/art/characters.ts)
 *      so the scene player renders qila/ezra actors.
 *   2. Extend `BackgroundKey` + `renderBackground` (src/art/backgrounds.ts)
 *      to delegate to `renderQilaEzraBackground`, extend the validator's
 *      `Bg` enum (scripts/validate-stories.mjs) with 'kamar-ezra' /
 *      'ruang-tamu', and switch the story's `bg` fields from the temporary
 *      'orchard' placeholder to the real keys.
 *   3. Register the slug in `REGISTERED_STORIES` (src/story/loader.ts).
 *   4. Optional CSS: `.char-idle-qila` / `.char-idle-ezra` idle loops and a
 *      scene-to-expression map (see `renderQila` / `renderEzra` chips).
 */

// ------------------------------------------------------------- palette (03)

const INK = '#262238'
const CREAM = '#FFF3E2'
const CORAL = '#FF5D5D'
const TEAL = '#19B3A6'
const TEAL_DARK = '#0E8C82'
const SUN = '#FFC53D'
const MAGENTA = '#E84A8A'
const SKY = '#C8EBE4'
const SKIN = '#E8A66C'
const SKIN_DARK = '#B96A3C'
const BLUSH = '#FF8B7E'
const MOUTH = '#7C2B3E'
const HAIR = '#1F1A2E'

/** Thick ink outline on every bold-flat shape (mockup: 3.5-4px). */
const OW = 3.5
const S = `stroke="${INK}" stroke-width="${OW}" stroke-linejoin="round"`
/** Fine ink stroke for facial features. */
const SF = `stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`

// ------------------------------------------------------------ character art

/** Qila expression chips (canon: cerewet / pemimpin / lembut). */
export type QilaExpression = 'cerewet-face' | 'warm-leader' | 'gentle'

/** Ezra expression chips (canon: senyum mudah / senyum lesung pipit / lelucon). */
export type EzraExpression = 'easy-smile' | 'grin-with-dimples' | 'joke-face'

const CHAR_VIEWBOX = '0 0 160 140'

function charSvg(body: string): string {
  return `<svg viewBox="${CHAR_VIEWBOX}" aria-hidden="true">${body}</svg>`
}

/** Ground shadow (outside the pose group so jumps keep the character grounded). */
function groundShadow(rx: number): string {
  return `<ellipse cx="80" cy="133" rx="${rx}" ry="6" fill="${INK}" opacity="0.14"/>`
}

function poseTransform(pose: Pose): string {
  if (pose === 'jump') return ' transform="translate(0,-14)"'
  if (pose === 'happy') return ' transform="translate(0,-4)"'
  return ''
}

/** One bold-flat arm: rounded sleeve + skin hand, rotated from the shoulder. */
function arm(sleeveColor: string, x: number, y: number, angle: number): string {
  return `<g transform="translate(${x},${y}) rotate(${angle})">
    <rect x="-6.5" y="-4" width="13" height="36" rx="6.5" fill="${sleeveColor}" ${S}/>
    <circle cx="0" cy="36" r="5.5" fill="${SKIN}" ${S}/>
  </g>`
}

/** Five-point star accent (Qila's hijab clip, confetti). */
function star(cx: number, cy: number, r: number, fill: string): string {
  return `<g transform="translate(${cx},${cy}) scale(${(r / 10).toFixed(3)})">
    <path d="M0 -10 L2.9 -3.1 10 -2.4 4.9 2.4 6.3 9.5 0 5.9 -6.3 9.5 -4.9 2.4 -10 -2.4 -2.9 -3.1 Z"
      fill="${fill}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </g>`
}

/** Big glint eyes in the bold-pop style (white sclera, ink pupil, white glint). */
function popEyes(leftX: number, rightX: number, cy: number, rx: number, ry: number, pupil: number): string {
  return `<g class="char-eyes">
    <ellipse cx="${leftX}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
    <circle cx="${leftX + 0.5}" cy="${cy + 1.2}" r="${pupil}" fill="${INK}"/>
    <circle cx="${leftX - 1.2}" cy="${cy - 2.2}" r="${(pupil * 0.38).toFixed(2)}" fill="#ffffff"/>
    <ellipse cx="${rightX}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
    <circle cx="${rightX + 0.5}" cy="${cy + 1.2}" r="${pupil}" fill="${INK}"/>
    <circle cx="${rightX - 1.2}" cy="${cy - 2.2}" r="${(pupil * 0.38).toFixed(2)}" fill="#ffffff"/>
  </g>`
}

/** Happy closed eyes (two ink arcs) — used by Ezra's grin/joke chips. */
function happyArcEyes(): string {
  return `<g class="char-eyes">
    <path d="M66.5 45 Q72 38.5 77.5 45" ${SF} fill="none"/>
    <path d="M82.5 45 Q88 38.5 93.5 45" ${SF} fill="none"/>
  </g>`
}

/**
 * Ezra's lesung pipit — CANON: bold skin-dark cheek dots with cream highlight
 * arcs, drawn in EVERY render (character file artNotes; manager's pick).
 */
function ezraDimples(): string {
  return `<g class="qez-dimples">
    <circle cx="63" cy="53" r="2.8" fill="${SKIN_DARK}"/>
    <circle cx="97" cy="53" r="2.8" fill="${SKIN_DARK}"/>
    <path d="M59.8 50.4 A4 4 0 0 1 65 49.8" stroke="${CREAM}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M95 49.8 A4 4 0 0 1 100.2 50.4" stroke="${CREAM}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </g>`
}

/**
 * Qila's hijab — CANON: rendered in EVERY scene. Bold-flat silhouette: hood
 * ellipse + shoulder drape in coral with a sunflower star-clip, thick ink
 * outline; no hair is ever visible.
 */
function qilaHijab(): string {
  return `<g class="qez-hijab">
    <ellipse cx="80" cy="48" rx="30" ry="34" fill="${CORAL}" ${S}/>
    ${star(104, 26, 7, SUN)}
  </g>`
}

function qilaFace(expression: QilaExpression): string {
  const brows: Record<QilaExpression, string> = {
    'cerewet-face': `<path d="M66 43 Q71 39.5 76 42.5" ${SF} fill="none"/>
      <path d="M84 42 Q89 39 94 43" ${SF} fill="none"/>`,
    'warm-leader': `<path d="M66 42 Q71 39.5 76 41.5" ${SF} fill="none"/>
      <path d="M84 41.5 Q89 39.5 94 42" ${SF} fill="none"/>`,
    gentle: `<path d="M67 42 Q72 40.5 77 42" ${SF} fill="none"/>
      <path d="M83 42 Q88 40.5 93 42" ${SF} fill="none"/>`,
  }
  const mouths: Record<QilaExpression, string> = {
    // Nagging: small open rectangle mouth (the cerewet beat).
    'cerewet-face': `<rect x="75" y="60" width="11" height="7" rx="3.5" fill="${MOUTH}" ${SF}/>`,
    'warm-leader': `<path d="M72 61 Q80 70 88 61" ${SF} fill="none"/>`,
    gentle: `<path d="M74 63 Q80 68 86 63" ${SF} fill="none"/>`,
  }
  return `<ellipse cx="80" cy="52" rx="17" ry="18" fill="${SKIN}" ${S}/>
    <g class="char-eyes">
      <ellipse cx="73" cy="51" rx="4.6" ry="5.6" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="73.5" cy="52.2" r="2.7" fill="${INK}"/>
      <circle cx="72.2" cy="49.8" r="1" fill="#ffffff"/>
      <ellipse cx="87" cy="51" rx="4.6" ry="5.6" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="87.5" cy="52.2" r="2.7" fill="${INK}"/>
      <circle cx="86.2" cy="49.8" r="1" fill="#ffffff"/>
    </g>
    ${brows[expression]}
    <path d="M80 56 Q81.5 58 80 59.5" ${SF} fill="none"/>
    ${mouths[expression]}
    <circle cx="66" cy="60" r="3" fill="${BLUSH}" opacity="0.85"/>
    <circle cx="94" cy="60" r="3" fill="${BLUSH}" opacity="0.85"/>`
}

/**
 * Qila — kakak. Hijab ALWAYS on (canon). Expression chips:
 * 'cerewet-face' (nag), 'warm-leader' (leader mode), 'gentle' (sayang adik).
 */
export function renderQila(pose: Pose, expression: QilaExpression = 'warm-leader'): string {
  const waveArm = pose === 'wave' ? arm(TEAL, 108, 98, -140) : arm(TEAL, 108, 98, -18)
  return charSvg(`
    ${groundShadow(46)}
    <g${poseTransform(pose)}>
      <!-- gamis dress (teal) with sun hem band + coral batik dots -->
      <path d="M58 92 L102 92 L114 124 Q80 132 46 124 Z" fill="${TEAL}" ${S}/>
      <path d="M46.8 121 Q80 129 113.2 121 L114 124 Q80 132 46 124 Z" fill="${SUN}" ${S}/>
      <circle cx="62" cy="125.5" r="1.8" fill="${CORAL}"/>
      <circle cx="74" cy="128" r="1.8" fill="${CORAL}"/>
      <circle cx="88" cy="128" r="1.8" fill="${CORAL}"/>
      <circle cx="99" cy="125.5" r="1.8" fill="${CORAL}"/>
      ${arm(TEAL, 52, 98, 18)}
      ${waveArm}
      ${qilaHijab()}
      <!-- under-chin shoulder drape over the dress top -->
      <path d="M52 78 Q80 72 108 78 L114 100 Q80 112 46 100 Z" fill="${CORAL}" ${S}/>
      ${qilaFace(expression)}
    </g>`)
}

function ezraFace(expression: EzraExpression): string {
  const brows: Record<EzraExpression, string> = {
    'easy-smile': `<path d="M65 36 Q71 33.5 77 35.5" ${SF} fill="none"/>
      <path d="M83 35.5 Q89 33.5 95 36" ${SF} fill="none"/>`,
    'grin-with-dimples': `<path d="M65 37 Q71 34 77 36" ${SF} fill="none"/>
      <path d="M83 36 Q89 34 95 37" ${SF} fill="none"/>`,
    'joke-face': `<path d="M65 38 Q71 32.5 77 35" ${SF} fill="none"/>
      <path d="M83 35 Q89 33 95 35.5" ${SF} fill="none"/>`,
  }
  const eyes: Record<EzraExpression, string> = {
    'easy-smile': popEyes(72, 88, 45, 5.2, 6.4, 3.1),
    'grin-with-dimples': happyArcEyes(),
    'joke-face': `<g class="char-eyes">
      <path d="M66.5 45 Q72 38.5 77.5 45" ${SF} fill="none"/>
      <ellipse cx="88" cy="45" rx="5.2" ry="6.4" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="88.5" cy="46.2" r="3.1" fill="${INK}"/>
      <circle cx="86.8" cy="42.8" r="1.1" fill="#ffffff"/>
    </g>`,
  }
  const mouths: Record<EzraExpression, string> = {
    'easy-smile': `<path d="M68 55 Q80 65 92 55" ${SF} fill="none"/>`,
    'grin-with-dimples': `<path d="M67 53 Q80 70 93 53 Q80 59 67 53 Z" fill="${MOUTH}" ${SF}/>
      <ellipse cx="80" cy="58.6" rx="6.5" ry="2.7" fill="${BLUSH}"/>`,
    'joke-face': `<path d="M68 54 Q80 66 92 52" ${SF} fill="none"/>`,
  }
  return `<circle cx="80" cy="44" r="22" fill="${SKIN}" ${S}/>
    <path d="M58 44 C56 20 68 14 80 14 C92 14 104 20 102 44 C102 38 98 35 95 39 C93 33 88 32 86 38 C82 32 78 32 74 38 C72 32 67 33 65 39 C62 35 58 38 58 44 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    ${eyes[expression]}
    ${brows[expression]}
    <path d="M80 50 Q81.5 52 80 53.5" ${SF} fill="none"/>
    ${mouths[expression]}
    ${ezraDimples()}`
}

/**
 * Ezra — adik. Lesung pipit drawn in EVERY render (canon). Expression chips:
 * 'easy-smile', 'grin-with-dimples', 'joke-face'.
 */
export function renderEzra(pose: Pose, expression: EzraExpression = 'easy-smile'): string {
  const waveArm = pose === 'wave' ? arm(TEAL, 104, 72, -140) : arm(TEAL, 104, 72, -16)
  return charSvg(`
    ${groundShadow(42)}
    <g${poseTransform(pose)}>
      ${arm(TEAL, 56, 72, 16)}
      ${waveArm}
      <!-- legs, shoes, shorts -->
      <rect x="68" y="106" width="10" height="18" rx="4" fill="${SKIN}" ${S}/>
      <rect x="82" y="106" width="10" height="18" rx="4" fill="${SKIN}" ${S}/>
      <rect x="64" y="124" width="16" height="9" rx="4.5" fill="${INK}" ${S}/>
      <rect x="80" y="124" width="16" height="9" rx="4.5" fill="${INK}" ${S}/>
      <rect x="58" y="92" width="44" height="18" rx="8" fill="${SUN}" ${S}/>
      <!-- shirt -->
      <rect x="54" y="62" width="52" height="40" rx="14" fill="${TEAL}" ${S}/>
      ${ezraFace(expression)}
    </g>`)
}

/** Pose → default expression chips for the engine-compatible registry. */
const DEFAULT_QILA_EXPRESSION: Record<Pose, QilaExpression> = {
  idle: 'gentle',
  happy: 'warm-leader',
  wave: 'warm-leader',
  jump: 'warm-leader',
}

const DEFAULT_EZRA_EXPRESSION: Record<Pose, EzraExpression> = {
  idle: 'easy-smile',
  happy: 'easy-smile',
  wave: 'easy-smile',
  jump: 'grin-with-dimples',
}

/**
 * Drop-in character registry (same shape as src/art/characters.ts
 * `CHARACTERS`) — the follow-up wiring PR merges this into the engine
 * registry so the scene player renders qila/ezra actors.
 */
export const QILA_EZRA_CHARACTERS: Record<string, CharacterDef> = {
  qila: {
    name: 'Qila',
    render: (pose) => renderQila(pose, DEFAULT_QILA_EXPRESSION[pose]),
  },
  ezra: {
    name: 'Ezra',
    render: (pose) => renderEzra(pose, DEFAULT_EZRA_EXPRESSION[pose]),
  },
}

// ---------------------------------------------------------------- scene props

export interface TrukOptions {
  /** Dashed ghost silhouette + "?" badge — the truck-is-missing beat. */
  hidden?: boolean
}

/** Ezra's toy truck — solid when found, dashed ghost with "?" when missing. */
export function renderTruk(options: TrukOptions = {}): string {
  if (options.hidden) {
    return `<svg viewBox="0 0 160 120" aria-hidden="true" class="qez-truk qez-truk--hidden">
      <g stroke="${INK}" stroke-width="3.5" stroke-dasharray="9 7" fill="none" stroke-linejoin="round">
        <rect x="30" y="28" width="66" height="44" rx="6"/>
        <path d="M100 40 L124 40 L134 56 L134 72 L100 72 Z"/>
        <circle cx="46" cy="78" r="10"/>
        <circle cx="114" cy="78" r="10"/>
      </g>
      <circle cx="146" cy="24" r="14" fill="${SUN}" ${S}/>
      <text x="146" y="31" text-anchor="middle" font-size="19" font-weight="900" fill="${INK}" font-family="system-ui,sans-serif">?</text>
    </svg>`
  }
  return `<svg viewBox="0 0 160 120" aria-hidden="true" class="qez-truk">
    <ellipse cx="84" cy="94" rx="62" ry="7" fill="${INK}" opacity="0.14"/>
    <!-- hard offset shadow copy (bold-flat, no gradients) -->
    <g fill="${INK}" opacity="0.9" transform="translate(4,5)">
      <rect x="30" y="28" width="66" height="44" rx="6"/>
      <path d="M100 40 L124 40 L134 56 L134 72 L100 72 Z"/>
    </g>
    <rect x="30" y="28" width="66" height="44" rx="6" fill="${SUN}" ${S}/>
    <path d="M100 40 L124 40 L134 56 L134 72 L100 72 Z" fill="${CORAL}" ${S}/>
    <path d="M103 44 L120 44 L127 56 L103 56 Z" fill="${SKY}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="46" cy="78" r="10" fill="${INK}"/>
    <circle cx="46" cy="78" r="3.5" fill="${CREAM}"/>
    <circle cx="114" cy="78" r="10" fill="${INK}"/>
    <circle cx="114" cy="78" r="3.5" fill="${CREAM}"/>
    <!-- batik-dot accent on the cargo -->
    <circle cx="46" cy="46" r="3" fill="${MAGENTA}"/>
    <circle cx="62" cy="56" r="3" fill="${CORAL}"/>
    <circle cx="80" cy="44" r="3" fill="${TEAL}"/>
  </svg>`
}

/** Peta mainan — Qila's treasure-map game prop (leader-mode beat). */
export function renderPetaMainan(): string {
  return `<svg viewBox="0 0 160 140" aria-hidden="true" class="qez-peta">
    <rect x="19" y="15" width="132" height="120" rx="12" fill="${INK}" opacity="0.9"/>
    <rect x="14" y="10" width="132" height="120" rx="12" fill="#ffffff" ${S}/>
    <path d="M34 106 Q60 50 92 84 T126 36" stroke="${CORAL}" stroke-width="5" fill="none" stroke-dasharray="11 8" stroke-linecap="round"/>
    <circle cx="34" cy="106" r="7" fill="${SUN}" stroke="${INK}" stroke-width="3"/>
    <path d="M118 26 L134 42 M134 26 L118 42" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <rect x="56" y="26" width="44" height="26" rx="7" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="8 6"/>
    ${star(126, 104, 8, SUN)}
  </svg>`
}

/** Rumah truk — the toy box the siblings build together (closing beat). */
export function renderRumahTruk(): string {
  return `<svg viewBox="0 0 160 120" aria-hidden="true" class="qez-rumah-truk">
    <ellipse cx="82" cy="112" rx="62" ry="6" fill="${INK}" opacity="0.14"/>
    <path d="M28 56 L136 56 L128 110 L36 110 Z" fill="${INK}" opacity="0.9" transform="translate(4,-6)"/>
    <path d="M28 56 L136 56 L128 110 L36 110 Z" fill="${SUN}" ${S}/>
    <rect x="34" y="38" width="34" height="18" rx="5" fill="${MAGENTA}" ${S}/>
    <circle cx="92" cy="46" r="9" fill="${TEAL}" ${S}/>
    <rect x="106" y="36" width="22" height="20" rx="5" fill="${SKY}" ${S}/>
    <!-- label: mini truck icon (no text — toddler-first) -->
    <rect x="52" y="68" width="56" height="26" rx="7" fill="#ffffff" stroke="${INK}" stroke-width="3"/>
    <rect x="58" y="74" width="18" height="11" rx="2" fill="${CORAL}"/>
    <path d="M77 76 L88 76 L91 83 L77 83 Z" fill="${SUN}"/>
    <circle cx="63" cy="86" r="2.6" fill="${INK}"/>
    <circle cx="84" cy="86" r="2.6" fill="${INK}"/>
  </svg>`
}

// ---------------------------------------------------------------- backgrounds

export type QilaEzraBackgroundKey = 'kamar-ezra' | 'ruang-tamu'

export const QILA_EZRA_BG_KEYS: readonly QilaEzraBackgroundKey[] = ['kamar-ezra', 'ruang-tamu']

export interface QilaEzraLayer {
  /** Same convention as src/art/backgrounds.ts Layer. */
  className: string
  svg: string
}

/** Per-layer hard offset shadow filter (unique id per SVG, bold-flat 5,5). */
function shadowDefs(id: string): string {
  return `<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="5" dy="5" stdDeviation="0" flood-color="${INK}" flood-opacity="0.9"/>
  </filter></defs>`
}

/**
 * Bold Flat Pop backgrounds for Story 2, 3 parallax layers using the engine's
 * bg-layer class convention. 'kamar-ezra' = Ezra's bedroom (bed with
 * under-bed gap, window with masjid silhouette, bismillah plaque, toy shelf);
 * 'ruang-tamu' = living room (cushion sofa, lamp, toy basket).
 */
export function renderQilaEzraBackground(key: QilaEzraBackgroundKey): QilaEzraLayer[] {
  if (key === 'ruang-tamu') return ruangTamuLayers()
  return kamarEzraLayers()
}

function kamarEzraLayers(): QilaEzraLayer[] {
  return [
    { className: 'bg-layer bg-layer--far', svg: kamarFar() },
    { className: 'bg-layer bg-layer--mid', svg: kamarMid() },
    { className: 'bg-layer bg-layer--near', svg: kamarNear() },
  ]
}

function kamarFar(): string {
  return `<svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    ${shadowDefs('qez-sh-far')}
    <rect width="800" height="300" fill="${CREAM}"/>
    <!-- star-dot confetti motif -->
    <circle cx="500" cy="70" r="6" fill="${MAGENTA}"/>
    <circle cx="720" cy="64" r="5" fill="${TEAL}"/>
    <circle cx="320" cy="240" r="5" fill="${SUN}"/>
    ${star(600, 90, 9, TEAL)}
    ${star(150, 250, 8, MAGENTA)}
    <!-- window: night sky, crescent, masjid silhouette (Nusantara identity) -->
    <g filter="url(#qez-sh-far)">
      <rect x="66" y="60" width="216" height="196" fill="${SKY}" stroke="${INK}" stroke-width="8"/>
      <circle cx="112" cy="110" r="16" fill="${SUN}" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="119" cy="105" r="13" fill="${SKY}"/>
      ${star(146, 92, 6, SUN)}
      <path d="M88 244 L88 216 Q111 192 134 216 L134 244 Z" fill="${TEAL}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="146" y="198" width="11" height="46" fill="${MAGENTA}" stroke="${INK}" stroke-width="3"/>
      <path d="M146 198 Q151.5 188 157 198 Z" fill="${MAGENTA}" stroke="${INK}" stroke-width="3"/>
      <path d="M170 244 L170 224 Q186 208 202 224 L202 244 Z" fill="${TEAL}" stroke="${INK}" stroke-width="3"/>
      <line x1="174" y1="64" x2="174" y2="252" stroke="${INK}" stroke-width="7"/>
      <line x1="70" y1="160" x2="278" y2="160" stroke="${INK}" stroke-width="7"/>
    </g>
    <!-- bismillah plaque (crescent motif, no text — narration carries the words) -->
    <g filter="url(#qez-sh-far)">
      <rect x="330" y="52" width="150" height="44" rx="14" fill="${SUN}" stroke="${INK}" stroke-width="4.5"/>
      <circle cx="366" cy="74" r="10" fill="${CORAL}"/>
      <circle cx="372" cy="70" r="8" fill="${SUN}"/>
      ${star(388, 66, 6, CORAL)}
    </g>
  </svg>`
}

function kamarMid(): string {
  return `<svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    ${shadowDefs('qez-sh-mid')}
    <!-- toy shelf -->
    <g filter="url(#qez-sh-mid)">
      <rect x="124" y="120" width="152" height="12" rx="5" fill="#ffffff" stroke="${INK}" stroke-width="4"/>
      <rect x="140" y="88" width="26" height="32" rx="4" fill="${MAGENTA}" stroke="${INK}" stroke-width="3"/>
      <circle cx="198" cy="102" r="16" fill="${TEAL}" stroke="${INK}" stroke-width="3"/>
      <rect x="226" y="92" width="22" height="28" rx="4" fill="${SUN}" stroke="${INK}" stroke-width="3"/>
    </g>
    <!-- bed with under-bed gap + dashed ghost truck -->
    <g filter="url(#qez-sh-mid)">
      <rect x="640" y="60" width="30" height="190" rx="12" fill="${CORAL}" stroke="${INK}" stroke-width="4.5"/>
      <rect x="524" y="138" width="140" height="88" rx="10" fill="#ffffff" stroke="${INK}" stroke-width="4.5"/>
      <path d="M524 162 Q559 148 594 162 T664 162 L664 226 L524 226 Z" fill="${TEAL}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M544 190 l6 10 h-12 Z M576 182 l6 10 h-12 Z M610 194 l6 10 h-12 Z" fill="${SUN}" stroke="${INK}" stroke-width="2"/>
      <rect x="536" y="130" width="52" height="26" rx="12" fill="#ffffff" stroke="${INK}" stroke-width="3.5"/>
      <rect x="518" y="228" width="128" height="30" rx="8" fill="${TEAL_DARK}" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(544,214) scale(0.62)">
        <g stroke="${INK}" stroke-width="4" stroke-dasharray="8 6" fill="none" stroke-linejoin="round">
          <rect x="0" y="12" width="26" height="26" rx="5"/>
          <path d="M30 8 L86 8 L82 38 L30 38 Z"/>
          <circle cx="14" cy="44" r="7"/>
          <circle cx="70" cy="44" r="7"/>
        </g>
      </g>
    </g>
  </svg>`
}

function kamarNear(): string {
  return `<svg viewBox="0 0 800 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="800" height="140" fill="${TEAL}"/>
    <rect width="800" height="14" fill="${TEAL_DARK}" stroke="${INK}" stroke-width="4"/>
    <!-- rug -->
    <ellipse cx="400" cy="100" rx="170" ry="30" fill="${MAGENTA}" stroke="${INK}" stroke-width="4.5"/>
    <ellipse cx="400" cy="100" rx="124" ry="20" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="12 9"/>
    <circle cx="120" cy="60" r="5" fill="${SUN}"/>
    <circle cx="690" cy="54" r="5" fill="${SKY}"/>
  </svg>`
}

function ruangTamuLayers(): QilaEzraLayer[] {
  return [
    { className: 'bg-layer bg-layer--far', svg: ruangFar() },
    { className: 'bg-layer bg-layer--mid', svg: ruangMid() },
    { className: 'bg-layer bg-layer--near', svg: ruangNear() },
  ]
}

function ruangFar(): string {
  return `<svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    ${shadowDefs('qez-sh-rfar')}
    <rect width="800" height="300" fill="#FFE8C7"/>
    <circle cx="140" cy="70" r="6" fill="${TEAL}"/>
    <circle cx="420" cy="240" r="5" fill="${MAGENTA}"/>
    ${star(320, 80, 9, MAGENTA)}
    ${star(740, 220, 8, SUN)}
    <!-- window: afternoon garden -->
    <g filter="url(#qez-sh-rfar)">
      <rect x="500" y="66" width="200" height="170" fill="${SKY}" stroke="${INK}" stroke-width="8"/>
      <circle cx="556" cy="106" r="15" fill="${SUN}" stroke="${INK}" stroke-width="3.5"/>
      <path d="M506 236 Q560 196 620 228 T694 220 L694 232 L506 232 Z" fill="${TEAL}" stroke="${INK}" stroke-width="3"/>
      <line x1="600" y1="70" x2="600" y2="232" stroke="${INK}" stroke-width="6"/>
      <line x1="504" y1="152" x2="696" y2="152" stroke="${INK}" stroke-width="6"/>
    </g>
  </svg>`
}

function ruangMid(): string {
  return `<svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    ${shadowDefs('qez-sh-rmid')}
    <!-- floor lamp -->
    <g filter="url(#qez-sh-rmid)">
      <line x1="120" y1="120" x2="120" y2="240" stroke="${INK}" stroke-width="6"/>
      <path d="M96 120 L144 120 L134 84 L106 84 Z" fill="${SUN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="120" cy="244" rx="26" ry="5" fill="${INK}" opacity="0.9"/>
    </g>
    <!-- sofa with cushions (the tap-the-cushions beat lives in narration) -->
    <g filter="url(#qez-sh-rmid)">
      <rect x="200" y="96" width="300" height="70" rx="18" fill="${CORAL}" stroke="${INK}" stroke-width="4.5"/>
      <rect x="222" y="104" width="86" height="44" rx="12" fill="${SUN}" stroke="${INK}" stroke-width="3.5" transform="rotate(-7 265 126)"/>
      <rect x="392" y="104" width="86" height="44" rx="12" fill="${SUN}" stroke="${INK}" stroke-width="3.5" transform="rotate(6 435 126)"/>
      <rect x="200" y="150" width="300" height="90" rx="18" fill="${CORAL}" stroke="${INK}" stroke-width="4.5"/>
      <rect x="212" y="142" width="130" height="34" rx="12" fill="${TEAL}" stroke="${INK}" stroke-width="3.5"/>
      <rect x="350" y="142" width="130" height="34" rx="12" fill="${TEAL}" stroke="${INK}" stroke-width="3.5"/>
      <rect x="188" y="128" width="26" height="112" rx="12" fill="${CORAL}" stroke="${INK}" stroke-width="4.5"/>
      <rect x="486" y="128" width="26" height="112" rx="12" fill="${CORAL}" stroke="${INK}" stroke-width="4.5"/>
    </g>
    <!-- toy basket -->
    <g filter="url(#qez-sh-rmid)">
      <path d="M600 190 L700 190 L690 244 L610 244 Z" fill="${MAGENTA}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M614 196 L626 238 M640 196 L644 240 M666 196 L660 240 M688 196 L676 238" stroke="${INK}" stroke-width="2.5" opacity="0.6"/>
      <circle cx="636" cy="180" r="14" fill="${TEAL}" stroke="${INK}" stroke-width="3"/>
      ${star(668, 172, 8, SUN)}
    </g>
  </svg>`
}

function ruangNear(): string {
  return `<svg viewBox="0 0 800 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="800" height="140" fill="${TEAL}"/>
    <rect width="800" height="14" fill="${TEAL_DARK}" stroke="${INK}" stroke-width="4"/>
    <!-- rug -->
    <ellipse cx="360" cy="102" rx="180" ry="30" fill="${SUN}" stroke="${INK}" stroke-width="4.5"/>
    <ellipse cx="360" cy="102" rx="132" ry="20" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="12 9"/>
    <circle cx="640" cy="58" r="5" fill="${MAGENTA}"/>
    <circle cx="120" cy="64" r="5" fill="${CORAL}"/>
  </svg>`
}
