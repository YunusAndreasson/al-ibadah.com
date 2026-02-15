/**
 * Finds non-canonical transliteration variants in content files
 * and optionally replaces them with the canonical form.
 *
 * Strategy: For each canonical term, build a regex that matches any
 * transliteration variant (with/without diacritics, underlines, macrons).
 * Then scan all content files for matches and flag non-canonical spellings.
 *
 * Usage:
 *   npx tsx scripts/normalize-terms.ts          # dry-run (report only)
 *   npx tsx scripts/normalize-terms.ts --fix    # apply replacements
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- 1. Load canonical glossary ---
const glossary = JSON.parse(
  readFileSync(join(__dirname, '../src/data/italicized-terms.json'), 'utf-8')
)

// --- 2. Configuration ---

// Terms whose patterns collide with common Swedish words.
// These are excluded from broad-text search entirely.
const EXCLUDE_TERMS = new Set([
  'Muslim', // Swedish "muslim" (person) — too common
  'Minā', // Swedish "mina" (my/mine) — pronoun
  'manī', // Swedish "mani" (mania)
  'āmīn', // Swedish name "Amin"
  'salām', // Swedish loanword "salam"
  'ṣā´', // Pattern matches Swedish "sa" (said) — too short/ambiguous
  'ridā\u2019', // Pattern matches Swedish "rida" (to ride)
])

// Directories/files to skip (review docs, not published content)
const EXCLUDE_PATHS = ['granskning/', 'KORREKTURLASNING.md', 'information/']

// --- 3. Build regex patterns for each canonical term ---

interface TermEntry {
  canonical: string
  variants: string[]
}

interface TermInfo {
  canonical: string
  pattern: RegExp
  knownForms: Set<string>
}

/**
 * Build a regex from a canonical form that matches any transliteration variant.
 * E.g. "s̲hawwāl" → matches "shawwal", "shawwāl", "s̲hawwāl", etc.
 */
function buildVariantRegex(canonical: string): RegExp {
  let pattern = ''
  const chars = [...canonical] // handle combining characters properly
  let i = 0

  while (i < chars.length) {
    const ch = chars[i]
    const next = chars[i + 1]

    // Combining low line (U+0332) — underlined digraph marker
    if (next === '\u0332') {
      // The base char + combining underline: make the underline optional
      pattern += `${escapeRegex(ch)}\u0332?`
      i += 2
      continue
    }

    // Macron vowels
    if ('āàáâ'.includes(ch)) {
      pattern += '[aāàáâ]'
      i++
      continue
    }
    if ('īìíî'.includes(ch)) {
      pattern += '[iīìíî]'
      i++
      continue
    }
    if ('ūùúû'.includes(ch)) {
      pattern += '[uūùúû]'
      i++
      continue
    }
    // Plain vowels should also match macron variants
    if (ch === 'a') {
      pattern += '[aāàáâ]'
      i++
      continue
    }
    if (ch === 'i') {
      pattern += '[iīìíî]'
      i++
      continue
    }
    if (ch === 'u') {
      pattern += '[uūùúû]'
      i++
      continue
    }

    // Dotted consonants
    if (ch === 'ḥ') {
      pattern += '[hḥ]'
      i++
      continue
    }
    if (ch === 'ṣ') {
      pattern += '[sṣ]'
      i++
      continue
    }
    if (ch === 'ṭ') {
      pattern += '[tṭ]'
      i++
      continue
    }
    if (ch === 'ḍ') {
      pattern += '[dḍ]'
      i++
      continue
    }
    if (ch === 'ẓ') {
      pattern += '[zẓ]'
      i++
      continue
    }
    // Plain consonants should also match dotted
    if (ch === 'h') {
      pattern += '[hḥ]'
      i++
      continue
    }

    // Ayn (´) and hamza (') — match any apostrophe variant or absence
    if ('\u00B4\u2018\u2019\u0027\u02BF\u0060'.includes(ch)) {
      pattern += '[\u00B4\u2018\u2019\u0027\u02BF\u0060]?'
      i++
      continue
    }

    // Hyphen variants
    if (ch === '-') {
      pattern += '[-\\s]?'
      i++
      continue
    }

    // Space
    if (ch === ' ') {
      pattern += '\\s+'
      i++
      continue
    }

    // Default: literal match (case-insensitive via flag)
    pattern += escapeRegex(ch)
    i++
  }

  return new RegExp(pattern, 'gi')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build term list sorted by length (longest first to match multi-word terms first)
const allTerms: TermInfo[] = []

for (const category of Object.values(glossary.categories) as any[]) {
  for (const term of category.terms as TermEntry[]) {
    // Skip terms that collide with Swedish words
    if (EXCLUDE_TERMS.has(term.canonical)) continue

    const known = new Set<string>()
    known.add(term.canonical)
    for (const v of term.variants) known.add(v)

    allTerms.push({
      canonical: term.canonical,
      pattern: buildVariantRegex(term.canonical),
      knownForms: known,
    })
  }
}

// Sort longest canonical first (so multi-word terms match before single-word)
allTerms.sort((a, b) => b.canonical.length - a.canonical.length)

// --- 4. Walk content files ---
function walkDir(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      // Skip excluded directories
      if (EXCLUDE_PATHS.some((p) => `${entry}/` === p)) continue
      files.push(...walkDir(full))
    } else if (full.endsWith('.md') && !entry.startsWith('_')) {
      // Skip excluded files
      if (EXCLUDE_PATHS.includes(entry)) continue
      files.push(full)
    }
  }
  return files
}

const contentDir = join(__dirname, '../content')
const mdFiles = walkDir(contentDir)

// --- 5. Scan files for non-canonical variants ---
interface Replacement {
  file: string
  line: number
  found: string
  canonical: string
  context: string
}

/**
 * Check if two strings differ only in case (not diacritics).
 * E.g. "Åkallan"/"åkallan" → true, "ramadan"/"ramaḍān" → false
 */
function isCaseOnlyDifference(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Find the index of the first actual letter in a string,
 * skipping combining characters, apostrophes, ayn (´), etc.
 */
function firstLetterIndex(chars: string[]): number {
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (ch.toUpperCase() !== ch.toLowerCase()) return i
  }
  return -1
}

/**
 * Preserve the original capitalization when replacing.
 * If found's first letter is uppercase and canonical's is lowercase,
 * capitalize the first letter of canonical.
 * E.g. matchCase("Tawhīd", "tawḥīd") → "Tawḥīd"
 *      matchCase("´Aqidah", "´aqīdah") → "´Aqīdah"
 */
function matchCase(found: string, canonical: string): string {
  const foundChars = [...found]
  const canonicalChars = [...canonical]
  const fi = firstLetterIndex(foundChars)
  const ci = firstLetterIndex(canonicalChars)
  if (fi < 0 || ci < 0) return canonical

  const foundLetter = foundChars[fi]
  if (foundLetter === foundLetter.toUpperCase() && foundLetter !== foundLetter.toLowerCase()) {
    canonicalChars[ci] = canonicalChars[ci].toUpperCase()
    return canonicalChars.join('')
  }
  return canonical
}

const replacements: Replacement[] = []

for (const filePath of mdFiles) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relPath = filePath.replace(`${contentDir}/`, '')

  // Find frontmatter end
  let bodyStart = 0
  if (lines[0] === '---') {
    const endIdx = lines.indexOf('---', 1)
    if (endIdx > 0) bodyStart = endIdx + 1
  }

  const body = lines.slice(bodyStart).join('\n')

  for (const term of allTerms) {
    term.pattern.lastIndex = 0
    let match: RegExpExecArray | null

    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
    while ((match = term.pattern.exec(body)) !== null) {
      const found = match[0]

      // Skip if already canonical or a known variant
      if (term.knownForms.has(found)) continue

      // Skip case-only differences (e.g. "Sunnah" at sentence start)
      if (isCaseOnlyDifference(found, term.canonical)) continue

      // Preserve original capitalization
      const replacement = matchCase(found, term.canonical)

      // Skip if case-matched result equals the found text (nothing to fix)
      if (replacement === found) continue

      // Calculate line number
      const beforeMatch = body.slice(0, match.index)
      const lineNum = bodyStart + beforeMatch.split('\n').length

      // Get surrounding context
      const lineContent = lines[lineNum - 1] || ''

      // Skip if the match is part of a larger word (check word boundaries)
      const charBefore = match.index > 0 ? body[match.index - 1] : ' '
      const charAfter = body[match.index + found.length] || ' '
      // Allow word boundaries: space, *, ", [, (, newline, start/end, punctuation
      const boundaryChars = /[\s*"'[\]().,;:!?\-–—/\n\r´`]/
      if (charBefore && !boundaryChars.test(charBefore)) continue
      if (charAfter && !boundaryChars.test(charAfter)) continue

      replacements.push({
        file: relPath,
        line: lineNum,
        found,
        canonical: replacement,
        context: lineContent.slice(
          Math.max(0, lineContent.indexOf(found) - 20),
          lineContent.indexOf(found) + found.length + 20
        ),
      })
    }
  }
}

// --- 6. Deduplicate and group ---
const grouped = new Map<string, { canonical: string; count: number; examples: string[] }>()
for (const r of replacements) {
  const key = `${r.found} → ${r.canonical}`
  const existing = grouped.get(key)
  if (existing) {
    existing.count++
    if (existing.examples.length < 3) {
      existing.examples.push(`${r.file}:${r.line}`)
    }
  } else {
    grouped.set(key, {
      canonical: r.canonical,
      count: 1,
      examples: [`${r.file}:${r.line}`],
    })
  }
}

const sorted = [...grouped.entries()].sort((a, b) => b[1].count - a[1].count)

const doFix = process.argv.includes('--fix')

if (sorted.length === 0) {
  console.log('No non-canonical variants found.')
  process.exit(0)
}

console.log(
  `Found ${sorted.length} unique variant(s) across ${replacements.length} occurrence(s):\n`
)
for (const [key, info] of sorted) {
  const [found] = key.split(' → ')
  console.log(`  "${found}" → "${info.canonical}"  (${info.count}x)`)
  for (const ex of info.examples) {
    console.log(`    ${ex}`)
  }
}

// --- 7. Apply fixes if --fix ---
if (doFix) {
  console.log('\nApplying fixes...')
  const fileReplacements = new Map<string, Replacement[]>()
  for (const r of replacements) {
    const full = join(contentDir, r.file)
    const list = fileReplacements.get(full) || []
    list.push(r)
    fileReplacements.set(full, list)
  }

  let filesChanged = 0
  for (const [filePath, reps] of fileReplacements) {
    let content = readFileSync(filePath, 'utf-8')
    // Sort replacements by found string length (longest first) to avoid partial replacements
    const uniqueReps = new Map<string, string>()
    for (const r of reps) {
      uniqueReps.set(r.found, r.canonical)
    }
    const sortedReps = [...uniqueReps.entries()].sort((a, b) => b[0].length - a[0].length)

    for (const [found, canonical] of sortedReps) {
      // Replace maintaining surrounding context (italic markers, etc.)
      content = content.replaceAll(found, canonical)
    }
    writeFileSync(filePath, content, 'utf-8')
    filesChanged++
  }
  console.log(`Updated ${filesChanged} file(s).`)
} else {
  console.log('\nDry run. Use --fix to apply replacements.')
}
