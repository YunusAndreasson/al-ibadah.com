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
