/**
 * Normalizes Arabic transliteration for fuzzy matching.
 * Strips macron vowels, removes apostrophe-like characters,
 * normalizes dotted/underlined consonants, and lowercases.
 *
 * This allows matching regardless of transliteration style:
 *   "tawḥīd" / "tawhīd" / "tawhid" / "Tawhid" → "tawhid"
 *   "´aqīdah" / "'aqidah" / "aqidah" → "aqidah"
 *   "k̲halīfah" / "khalifah" → "khalifah"
 */
export function normalizeArabic(text: string): string {
  return (
    text
      .toLowerCase()
      // Strip combining characters (e.g. U+0332 COMBINING LOW LINE for digraph underlines)
      .replace(/[\u0332\u0331\u0330\u0323\u0324]/g, '')
      // Macron vowels → base vowels
      .replace(/[āàáâ]/g, 'a')
      .replace(/[īìíî]/g, 'i')
      .replace(/[ūùúû]/g, 'u')
      // Strip all apostrophe-like characters (ayn ´, hamza ', smart quotes, etc.)
      .replace(/[\u00B4\u2018\u2019\u0027\u02BF\u0060]/g, '')
      // Dotted consonants → base
      .replace(/ṣ/g, 's')
      .replace(/ḥ/g, 'h')
      .replace(/ḍ/g, 'd')
      .replace(/ṭ/g, 't')
      .replace(/ẓ/g, 'z')
  )
}

const COMBINING = /[̀-ͯ]/

/**
 * Where `query` occurs in `text` under normalizeArabic, as [start, end) ranges of
 * the original `text`: "tarawih" finds "tarāwīḥ" and the range covers all of it,
 * so a highlight can wrap the original spelling. Swedish å, ä and ö are not folded.
 */
export function findNormalized(text: string, query: string): [number, number][] {
  const needle = normalizeArabic(query.trim())
  if (!needle) return []
  // Every rule in normalizeArabic is per character, so folding char by char gives
  // the same string while recording where each folded char came from.
  let folded = ''
  const origin: number[] = []
  for (let i = 0; i < text.length; i++) {
    for (const ch of normalizeArabic(text[i])) {
      folded += ch
      origin.push(i)
    }
  }
  const ranges: [number, number][] = []
  let at = folded.indexOf(needle)
  while (at !== -1) {
    let end = origin[at + needle.length - 1] + 1
    // Keep a trailing combining mark (the line under k̲h, the dot under ḥ) with its letter.
    while (end < text.length && COMBINING.test(text[end])) end++
    ranges.push([origin[at], end])
    at = folded.indexOf(needle, at + needle.length)
  }
  return ranges
}
