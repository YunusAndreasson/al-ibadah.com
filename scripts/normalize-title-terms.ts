/**
 * Normalizes Arabic transliteration in frontmatter titles to canonical forms.
 * Finds Arabic terms in titles and replaces simplified forms with proper
 * transliteration from the glossary (ḥ, ṣ, ṭ, k̲h, s̲h, macrons, etc.)
 *
 * Run with: pnpm tsx scripts/normalize-title-terms.ts
 * Dry run:  pnpm tsx scripts/normalize-title-terms.ts --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'
import { normalizeArabic } from '../src/lib/normalize-arabic.js'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const TERMS_FILE = path.join(process.cwd(), 'src/data/italicized-terms.json')
const DRY_RUN = process.argv.includes('--dry-run')

const SKIP_CATEGORIES = new Set(['swedishTerms'])
const SKIP_NORMALIZED = new Set(['muslim'])

interface Change {
  file: string
  oldTitle: string
  newTitle: string
  replacements: string[]
}

// Build normalized → canonical map from glossary
function buildCanonicalMap(): Map<string, string> {
  const data = JSON.parse(fs.readFileSync(TERMS_FILE, 'utf-8'))
  const map = new Map<string, string>()

  for (const [catKey, cat] of Object.entries(data.categories) as [string, any][]) {
    if (SKIP_CATEGORIES.has(catKey)) continue
    for (const term of cat.terms) {
      const norm = normalizeArabic(term.canonical)
      if (SKIP_NORMALIZED.has(norm)) continue
      map.set(norm, term.canonical)
      for (const variant of term.variants) {
        const vnorm = normalizeArabic(variant)
        if (!SKIP_NORMALIZED.has(vnorm)) {
          // Variants map to canonical (not to themselves)
          map.set(vnorm, term.canonical)
        }
      }
    }
  }

  return map
}

/**
 * Preserve capitalization when replacing.
 * If the original starts with an uppercase letter, capitalize the canonical form.
 */
function matchCase(canonical: string, original: string): string {
  const origFirst = original.match(/\p{Letter}/u)
  if (!origFirst) return canonical

  const isUppercase =
    origFirst[0] === origFirst[0].toUpperCase() &&
    origFirst[0] !== origFirst[0].toLowerCase()

  if (!isUppercase) return canonical

  // Capitalize first letter in canonical
  const canFirst = canonical.match(/\p{Letter}/u)
  if (!canFirst) return canonical

  const idx = canonical.indexOf(canFirst[0])
  if (idx < 0) return canonical

  return canonical.slice(0, idx) + canFirst[0].toUpperCase() + canonical.slice(idx + canFirst[0].length)
}

/**
 * Process a title string, replacing Arabic terms with canonical transliteration.
 */
function processTitle(
  title: string,
  canonicalMap: Map<string, string>,
): { result: string; replacements: string[] } {
  const replacements: string[] = []
  const parts = title.split(/(\s+)/)
  const result: string[] = []

  let i = 0
  while (i < parts.length) {
    const part = parts[i]

    if (/^\s*$/.test(part)) {
      result.push(part)
      i++
      continue
    }

    // Try multi-word match
    let matched = false
    for (let numWords = 4; numWords >= 2; numWords--) {
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
      const canonical = canonicalMap.get(norm)

      if (canonical) {
        const replacement = matchCase(canonical, candidate)
        if (replacement !== candidate) {
          replacements.push(`"${candidate}" → "${replacement}"`)
        }
        result.push(replacement)
        i = lastPos + 1
        matched = true
        break
      }
    }
    if (matched) continue

    // Try single word
    const norm = normalizeArabic(part)
    const canonical = canonicalMap.get(norm)
    if (canonical) {
      const replacement = matchCase(canonical, part)
      if (replacement !== part) {
        replacements.push(`"${part}" → "${replacement}"`)
      }
      result.push(replacement)
      i++
      continue
    }

    // Try hyphenated split: "ghusl-duschen" → "g̲husl-duschen"
    const hyphenIdx = part.indexOf('-')
    if (hyphenIdx > 0 && hyphenIdx < part.length - 1) {
      const before = part.slice(0, hyphenIdx)
      const after = part.slice(hyphenIdx)
      const bnorm = normalizeArabic(before)
      const bcanonical = canonicalMap.get(bnorm)

      if (bcanonical) {
        const replacement = matchCase(bcanonical, before)
        if (replacement !== before) {
          replacements.push(`"${before}" → "${replacement}" (in "${part}")`)
        }
        result.push(replacement + after)
        i++
        continue
      }
    }

    // No match
    result.push(part)
    i++
  }

  return { result: result.join(''), replacements }
}

function walkDirectory(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'granskning' || entry.name === 'information') continue
      files.push(...walkDirectory(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Extract and update title in frontmatter.
 * Handles: unquoted, single-quoted, double-quoted titles.
 * Skips >- multi-line titles.
 */
function processFile(
  filePath: string,
  canonicalMap: Map<string, string>,
): Change | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(process.cwd(), filePath)

  // Match title line in frontmatter
  const titleMatch = content.match(/^(title:\s*)(?:'([^']*)'|"([^"]*)"|(.+))$/m)
  if (!titleMatch) return null

  const prefix = titleMatch[1]
  const titleValue = titleMatch[2] ?? titleMatch[3] ?? titleMatch[4]
  if (!titleValue) return null

  // Skip >- multi-line titles
  if (titleValue.trim() === '>-' || titleValue.trim() === '|') return null

  const { result: newTitle, replacements } = processTitle(titleValue, canonicalMap)
  if (replacements.length === 0) return null

  // Reconstruct the title line preserving quoting style
  let newLine: string
  if (titleMatch[2] !== undefined) {
    // Was single-quoted
    newLine = `${prefix}'${newTitle}'`
  } else if (titleMatch[3] !== undefined) {
    // Was double-quoted
    newLine = `${prefix}"${newTitle}"`
  } else {
    // Was unquoted
    newLine = `${prefix}${newTitle}`
  }

  const newContent = content.replace(titleMatch[0], newLine)

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
  }

  return {
    file: relativePath,
    oldTitle: titleValue,
    newTitle,
    replacements,
  }
}

function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== NORMALIZING TITLE TERMS ===')
  console.log()

  const canonicalMap = buildCanonicalMap()
  console.log(`Loaded ${canonicalMap.size} term mappings`)

  const files = walkDirectory(CONTENT_DIR)
  console.log(`Found ${files.length} content files\n`)

  const changes: Change[] = []

  for (const file of files) {
    const change = processFile(file, canonicalMap)
    if (change) changes.push(change)
  }

  for (const change of changes) {
    console.log(`${change.file}:`)
    for (const r of change.replacements) {
      console.log(`  ${r}`)
    }
  }

  console.log()
  console.log('===================')
  console.log(`Files ${DRY_RUN ? 'would be ' : ''}changed: ${changes.length}`)
  console.log(`Total replacements: ${changes.reduce((n, c) => n + c.replacements.length, 0)}`)
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.')
  }
}

main()
