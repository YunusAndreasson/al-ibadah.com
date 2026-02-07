/**
 * Renders article titles with Arabic glossary terms wrapped in <em> tags.
 * Uses normalizeArabic for fuzzy matching, so it works regardless of
 * whether the title uses full canonical or simplified transliteration.
 *
 * Handles multi-word terms (e.g., "sujūd at-tilāwah"),
 * hyphenated compounds (e.g., "sunnah-bönen"), and capitalization.
 */

import { normalizeArabic } from './normalize-arabic'
import { glossary } from '../data/glossary'

const SKIP_CATEGORIES = new Set(['swedishTerms'])
const SKIP_NORMALIZED = new Set(['muslim'])

// Build normalized → canonical lookup (once at module load)
const normalizedMap = new Map<string, string>()
for (const [canonical, term] of Object.entries(glossary)) {
  if (SKIP_CATEGORIES.has(term.category)) continue
  const norm = normalizeArabic(canonical)
  if (SKIP_NORMALIZED.has(norm)) continue
  normalizedMap.set(norm, canonical)
  for (const variant of term.variants) {
    const vnorm = normalizeArabic(variant)
    if (!SKIP_NORMALIZED.has(vnorm)) {
      normalizedMap.set(vnorm, variant)
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Renders a title as HTML with Arabic terms wrapped in <em> tags.
 * Non-Arabic text is HTML-escaped.
 */
export function renderTitle(title: string): string {
  // Split preserving whitespace tokens
  const parts = title.split(/(\s+)/)
  const result: string[] = []

  let i = 0
  while (i < parts.length) {
    const part = parts[i]

    // Whitespace or empty — pass through
    if (/^\s*$/.test(part)) {
      result.push(part)
      i++
      continue
    }

    // Try multi-word match (4, 3, 2 consecutive words)
    let matched = false
    for (let numWords = 4; numWords >= 2; numWords--) {
      // Collect next numWords word tokens
      const wordPositions: number[] = [i]
      let j = i + 1
      while (wordPositions.length < numWords && j < parts.length) {
        if (!/^\s*$/.test(parts[j])) wordPositions.push(j)
        j++
      }
      if (wordPositions.length < numWords) continue

      const lastPos = wordPositions[wordPositions.length - 1]
      const candidate = parts.slice(i, lastPos + 1).join('')
      const norm = normalizeArabic(candidate)

      if (normalizedMap.has(norm)) {
        result.push(`<em>${escapeHtml(candidate)}</em>`)
        i = lastPos + 1
        matched = true
        break
      }
    }
    if (matched) continue

    // Try single word
    const norm = normalizeArabic(part)
    if (normalizedMap.has(norm)) {
      result.push(`<em>${escapeHtml(part)}</em>`)
      i++
      continue
    }

    // Try hyphenated split: "sunnah-bönen" → "<em>sunnah</em>-bönen"
    const hyphenIdx = part.indexOf('-')
    if (hyphenIdx > 0 && hyphenIdx < part.length - 1) {
      const before = part.slice(0, hyphenIdx)
      const after = part.slice(hyphenIdx)
      const bnorm = normalizeArabic(before)
      if (normalizedMap.has(bnorm)) {
        result.push(`<em>${escapeHtml(before)}</em>${escapeHtml(after)}`)
        i++
        continue
      }
    }

    // No match — pass through escaped
    result.push(escapeHtml(part))
    i++
  }

  return result.join('')
}
