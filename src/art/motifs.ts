/**
 * Batik motifs as inline SVG — art tokens per the design language: warm
 * pastels + batik accent borders (simplified mega mendung waves, parang-ish
 * diagonals). Hand-coded, no external assets.
 */

/** Simplified mega mendung wave band (repeating scalloped cloud waves). */
export function megaMendung(width: number, height = 26): string {
  const scallop = 40
  let waves = ''
  for (let x = 0; x < width + scallop; x += scallop) {
    waves += `<path d="M${x} ${height} q ${scallop / 4} -${height * 0.8} ${scallop / 2} -${height * 0.8} q ${scallop / 4} 0 ${scallop / 2} ${height * 0.8}" fill="none" stroke="#2d5a7b" stroke-width="3" opacity="0.55"/>`
    waves += `<path d="M${x + scallop / 4} ${height} q ${scallop / 4} -${height * 0.45} ${scallop / 2} -${height * 0.45}" fill="none" stroke="#5e8fb5" stroke-width="2.5" opacity="0.45"/>`
  }
  return `<svg class="motif-batik" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" preserveAspectRatio="none"><rect width="${width}" height="${height}" fill="#dcebf5"/>${waves}</svg>`
}

/** Batik star sticker for the Album Hikmah shelf. */
export function batikStar(size = 72): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#f8e8c8" stroke="#b8923f" stroke-width="2"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="#c94f76" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="M32 14l4.8 9.7 10.7 1.6-7.8 7.6 1.8 10.6-9.5-5-9.5 5 1.8-10.6-7.8-7.6 10.7-1.6z" fill="#c94f76"/>
  </svg>`
}
