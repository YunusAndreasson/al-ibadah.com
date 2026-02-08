/**
 * Extracts glossary term definitions from footnotes in content files.
 * Finds patterns like *term*[^n] where [^n]: contains a definition.
 *
 * Run with: pnpm tsx scripts/extract-glossary-definitions.ts
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { normalizeArabic } from '../src/lib/normalize-arabic.js'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const TERMS_FILE = path.join(process.cwd(), 'src', 'data', 'italicized-terms.json')
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'glossary.ts')

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

interface GlossaryTerm {
  canonical: string
  variants: string[]
  definition: string
  category: string
}

/**
 * Build a term map using normalized keys for fuzzy matching.
 * Maps normalized form → { canonical, category }
 */
async function loadTerms(): Promise<Map<string, { canonical: string; category: string }>> {
  const content = await fs.readFile(TERMS_FILE, 'utf-8')
  const data: TermsData = JSON.parse(content)

  const termMap = new Map<string, { canonical: string; category: string }>()

  for (const [categoryKey, category] of Object.entries(data.categories)) {
    for (const term of category.terms) {
      const entry = { canonical: term.canonical, category: categoryKey }

      // Map normalized canonical
      termMap.set(normalizeArabic(term.canonical), entry)

      // Map normalized variants
      for (const variant of term.variants) {
        termMap.set(normalizeArabic(variant), entry)
      }
    }
  }

  return termMap
}

async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'granskning') continue
      files.push(...(await walkDirectory(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

interface FootnoteMatch {
  term: string
  footnoteId: string
  position: number
}

function findTermFootnoteRefs(content: string): FootnoteMatch[] {
  const matches: FootnoteMatch[] = []
  // Match *term*[^n] pattern - term in italics followed by footnote ref
  const pattern = /\*([^*]+)\*\[\^(\d+)\]/g

  for (const match of content.matchAll(pattern)) {
    matches.push({
      term: match[1],
      footnoteId: match[2],
      position: match.index ?? 0,
    })
  }

  return matches
}

function extractFootnoteDefinitions(content: string): Map<string, string> {
  const definitions = new Map<string, string>()
  // Match [^n]: definition, including multi-line continuation (indented lines)
  const pattern = /^\[\^(\d+)\]:\s*(.+(?:\n(?!\[\^)[ \t]+.+)*)$/gm

  for (const match of content.matchAll(pattern)) {
    // Collapse multi-line definitions into a single line
    const definition = match[2].replace(/\n[ \t]+/g, ' ').trim()
    definitions.set(match[1], definition)
  }

  return definitions
}

function isDefinitionNotReference(definition: string): boolean {
  // Filter out definitions that are just references (citations)
  const hadithRefPattern =
    /^\*?[a-zA-ZāīūĀĪŪ'-]+\*?\s*\d+[:/]?\d*(\s*(och|and|,)\s*\*?[a-zA-ZāīūĀĪŪ'-]+\*?\s*\d+[:/]?\d*)*$/i
  if (hadithRefPattern.test(definition)) {
    return false
  }

  if (definition.length < 15 && /^\d/.test(definition)) {
    return false
  }

  return definition.length >= 5
}

async function extractDefinitions(): Promise<Map<string, Map<string, number>>> {
  const termMap = await loadTerms()
  const files = await walkDirectory(CONTENT_DIR)

  // Map: canonical term -> definition -> count
  const definitionCounts = new Map<string, Map<string, number>>()

  for (const file of files) {
    const fileContent = await fs.readFile(file, 'utf-8')
    const { content } = matter(fileContent)

    const termRefs = findTermFootnoteRefs(content)
    const footnotes = extractFootnoteDefinitions(content)

    for (const ref of termRefs) {
      // Use normalized matching
      const normalized = normalizeArabic(ref.term)
      const termInfo = termMap.get(normalized)

      if (!termInfo) continue // Not a known glossary term

      const definition = footnotes.get(ref.footnoteId)
      if (!definition) continue // No definition found

      if (!isDefinitionNotReference(definition)) continue // Skip references

      const canonical = termInfo.canonical

      if (!definitionCounts.has(canonical)) {
        definitionCounts.set(canonical, new Map())
      }

      const counts = definitionCounts.get(canonical)!
      counts.set(definition, (counts.get(definition) || 0) + 1)
    }
  }

  return definitionCounts
}

function selectBestDefinition(definitions: Map<string, number>): string | null {
  if (definitions.size === 0) return null

  const sorted = [...definitions.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1] // Higher count first
    return a[0].length - b[0].length // Shorter definition first
  })

  return sorted[0][0]
}

async function generateGlossary(): Promise<void> {
  console.log('Extracting glossary definitions from content files...\n')

  const definitionCounts = await extractDefinitions()

  // Load original terms data to preserve structure
  const termsContent = await fs.readFile(TERMS_FILE, 'utf-8')
  const termsData: TermsData = JSON.parse(termsContent)

  const glossaryTerms: GlossaryTerm[] = []
  const termsWithDefinitions = new Set<string>()
  const termsWithoutDefinitions: string[] = []

  // Process each category
  for (const [categoryKey, category] of Object.entries(termsData.categories)) {
    for (const term of category.terms) {
      // Check for pre-defined definition (e.g. Swedish terms)
      let bestDefinition: string | null = null

      if (term.definition) {
        bestDefinition = term.definition
      } else {
        const definitions = definitionCounts.get(term.canonical)
        bestDefinition = definitions ? selectBestDefinition(definitions) : null
      }

      if (bestDefinition) {
        glossaryTerms.push({
          canonical: term.canonical,
          variants: term.variants,
          definition: bestDefinition,
          category: categoryKey,
        })
        termsWithDefinitions.add(term.canonical)
      } else {
        termsWithoutDefinitions.push(term.canonical)
      }
    }
  }

  // Sort terms alphabetically
  glossaryTerms.sort((a, b) => a.canonical.localeCompare(b.canonical, 'sv'))

  // Generate TypeScript file
  const output = `// Auto-generated glossary data - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
// Run: pnpm tsx scripts/extract-glossary-definitions.ts

import { normalizeArabic } from '../lib/normalize-arabic'

export interface GlossaryTerm {
  canonical: string
  variants: string[]
  definition: string
  category: string
}

export const glossary: Record<string, GlossaryTerm> = {
${glossaryTerms
  .map(
    (term) => `  ${JSON.stringify(term.canonical)}: {
    canonical: ${JSON.stringify(term.canonical)},
    variants: ${JSON.stringify(term.variants)},
    definition: ${JSON.stringify(term.definition)},
    category: ${JSON.stringify(term.category)},
  }`
  )
  .join(',\n')}
}

// Build variant map using normalization for fuzzy matching
const variantMap = new Map<string, string>()
for (const [canonical, term] of Object.entries(glossary)) {
  variantMap.set(normalizeArabic(canonical), canonical)
  for (const variant of term.variants) {
    variantMap.set(normalizeArabic(variant), canonical)
  }
}

export function findGlossaryTerm(text: string): GlossaryTerm | undefined {
  const canonical = variantMap.get(normalizeArabic(text))
  return canonical ? glossary[canonical] : undefined
}
`

  await fs.writeFile(OUTPUT_FILE, output, 'utf-8')

  // Print summary
  console.log('===================')
  console.log('Extraction Summary')
  console.log('===================')
  console.log(`Terms with definitions: ${termsWithDefinitions.size}`)
  console.log(`Terms without definitions: ${termsWithoutDefinitions.length}`)
  console.log(`\nOutput written to: ${OUTPUT_FILE}`)

  if (termsWithoutDefinitions.length > 0) {
    console.log('\nTerms without definitions:')
    for (const term of termsWithoutDefinitions.slice(0, 30)) {
      console.log(`  - ${term}`)
    }
    if (termsWithoutDefinitions.length > 30) {
      console.log(`  ... and ${termsWithoutDefinitions.length - 30} more`)
    }
  }

  // Show sample definitions
  console.log('\nSample extracted definitions:')
  let count = 0
  for (const term of glossaryTerms) {
    if (count >= 5) break
    console.log(`  ${term.canonical}: "${term.definition.substring(0, 60)}..."`)
    count++
  }
}

generateGlossary().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
