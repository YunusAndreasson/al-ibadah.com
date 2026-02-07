/**
 * Normalizes Arabic transliterations in content files to use canonical forms.
 * Finds italic terms (*term*) and replaces with the proper transliteration
 * from italicized-terms.json (with ḥ, ṣ, ṭ, ḍ, k̲h, s̲h, macrons, etc.)
 *
 * Run with: pnpm tsx scripts/normalize-content-transliterations.ts
 * Dry run:  pnpm tsx scripts/normalize-content-transliterations.ts --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'
import { normalizeArabic } from '../src/lib/normalize-arabic.js'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const TERMS_FILE = path.join(process.cwd(), 'src', 'data', 'italicized-terms.json')
const DRY_RUN = process.argv.includes('--dry-run')

interface TermEntry {
  canonical: string
  variants: string[]
  definition?: string
}

interface TermCategory {
  description: string
  terms: TermEntry[]
}

interface TermsData {
  description: string
  categories: Record<string, TermCategory>
}

/**
 * Build a map of normalized form → canonical form for replacement.
 * Only includes Arabic terms (not Swedish terms which don't need normalization).
 */
function buildReplacementMap(): Map<string, string> {
  const content = fs.readFileSync(TERMS_FILE, 'utf-8')
  const data: TermsData = JSON.parse(content)

  const map = new Map<string, string>()

  for (const [catKey, cat] of Object.entries(data.categories)) {
    // Skip Swedish terms — they don't need Arabic transliteration normalization
    if (catKey === 'swedishTerms') continue

    for (const term of cat.terms) {
      // Map normalized canonical → canonical
      map.set(normalizeArabic(term.canonical), term.canonical)

      // Map normalized variants → canonical
      for (const variant of term.variants) {
        map.set(normalizeArabic(variant), term.canonical)
      }
    }
  }

  return map
}

function walkDirectory(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
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
 * Normalize italic terms in content.
 * Matches *term* patterns and replaces term with canonical form if found in glossary.
 * Preserves footnote references like *term*[^1].
 */
function normalizeContent(content: string, replacementMap: Map<string, string>): { result: string; changes: string[] } {
  const changes: string[] = []

  // Match italic terms: *text* (but not ** bold or *** bold-italic)
  // Also handles *term*[^n] footnote patterns
  const result = content.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    (match, term: string) => {
      // Check if this italic text contains footnote refs like [^1]
      // Extract the base term (without footnote refs)
      const footnotePattern = /\[\^\d+\]/g
      const baseTerm = term.replace(footnotePattern, '').trim()

      if (!baseTerm) return match // Empty after removing footnotes

      const normalized = normalizeArabic(baseTerm)
      const canonical = replacementMap.get(normalized)

      if (!canonical) return match // Not a known glossary term

      // Check if the base term is already canonical
      if (baseTerm === canonical) return match

      // Replace the term while preserving footnote refs
      const newTerm = term.replace(baseTerm, canonical)
      if (newTerm === term) return match // No actual change

      changes.push(`*${term}* → *${newTerm}*`)
      return `*${newTerm}*`
    }
  )

  return { result, changes }
}

function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== NORMALIZING CONTENT ===')
  console.log()

  const replacementMap = buildReplacementMap()
  console.log(`Loaded ${replacementMap.size} term mappings`)

  const files = walkDirectory(CONTENT_DIR)
  console.log(`Found ${files.length} content files`)
  console.log()

  let totalChanges = 0
  let filesChanged = 0

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const { result, changes } = normalizeContent(content, replacementMap)

    if (changes.length > 0) {
      filesChanged++
      totalChanges += changes.length
      const relPath = path.relative(CONTENT_DIR, file)

      if (DRY_RUN) {
        console.log(`${relPath} (${changes.length} changes):`)
        for (const change of changes.slice(0, 5)) {
          console.log(`  ${change}`)
        }
        if (changes.length > 5) {
          console.log(`  ... and ${changes.length - 5} more`)
        }
      } else {
        fs.writeFileSync(file, result, 'utf-8')
      }
    }
  }

  console.log()
  console.log('===================')
  console.log(`Files ${DRY_RUN ? 'would be ' : ''}changed: ${filesChanged}`)
  console.log(`Total replacements: ${totalChanges}`)
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.')
  }
}

main()
