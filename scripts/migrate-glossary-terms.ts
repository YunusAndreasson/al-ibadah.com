/**
 * Migration script to remove footnote references after glossary terms.
 * Transforms:
 *   *term*[^n] -> *term* (Arabic terms in italics)
 *   term[^n] -> term (Swedish terms in plain text)
 *
 * Run with: pnpm tsx scripts/migrate-glossary-terms.ts
 * Dry run:  pnpm tsx scripts/migrate-glossary-terms.ts --dry-run
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { findGlossaryTerm, glossary } from '../src/data/glossary.js'

// Build list of Swedish terms for matching
const swedishTerms = Object.values(glossary)
  .filter((term) => term.category === 'swedishTerms')
  .flatMap((term) => term.variants)
  .sort((a, b) => b.length - a.length) // Longer terms first

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Word boundary pattern that works with Swedish characters
const wordBoundaryStart = '(?<![a-zåäöA-ZÅÄÖ])'
const wordBoundaryEnd = '(?![a-zåäöA-ZÅÄÖ])'

const CONTENT_DIR = path.join(process.cwd(), 'content')

interface CLIOptions {
  dryRun: boolean
  verbose: boolean
  file?: string
}

interface MigrationResult {
  file: string
  removedRefs: number
  modifiedTerms: string[]
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    file: args.find((arg) => arg.startsWith('--file='))?.split('=')[1],
  }
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

interface FootnoteRef {
  term: string
  footnoteId: string
  fullMatch: string
  index: number
  isItalic: boolean
}

function findGlossaryFootnoteRefs(content: string): FootnoteRef[] {
  const refs: FootnoteRef[] = []

  // Match *term*[^n] where term might be a glossary term (Arabic/italic terms)
  const italicPattern = /\*([^*]+)\*\[\^(\d+)\]/g

  for (const match of content.matchAll(italicPattern)) {
    const term = match[1]
    const glossaryTerm = findGlossaryTerm(term)

    if (glossaryTerm) {
      refs.push({
        term: term,
        footnoteId: match[2],
        fullMatch: match[0],
        index: match.index ?? 0,
        isItalic: true,
      })
    }
  }

  // Match Swedish terms with footnotes (non-italic)
  if (swedishTerms.length > 0) {
    const swedishPattern = new RegExp(
      `${wordBoundaryStart}(${swedishTerms.map((t) => escapeRegex(t)).join('|')})\\[\\^(\\d+)\\]`,
      'gi'
    )

    for (const match of content.matchAll(swedishPattern)) {
      const term = match[1]
      const glossaryTerm = findGlossaryTerm(term)

      if (glossaryTerm && glossaryTerm.category === 'swedishTerms') {
        refs.push({
          term: term,
          footnoteId: match[2],
          fullMatch: match[0],
          index: match.index ?? 0,
          isItalic: false,
        })
      }
    }
  }

  // Sort by index for consistent processing
  refs.sort((a, b) => a.index - b.index)

  return refs
}

function getFootnoteDefinition(content: string, footnoteId: string): string | null {
  const pattern = new RegExp(`^\\[\\^${footnoteId}\\]:\\s*(.+)$`, 'm')
  const match = content.match(pattern)
  return match ? match[1].trim() : null
}

function isDefinitionFootnote(definition: string | null, isSwedishTerm: boolean): boolean {
  if (!definition) return false

  // Check if it's a hadith reference (not a definition)
  const hadithRefPattern =
    /^\*?[a-zA-ZāīūĀĪŪ'-]+\*?\s*\d+[:/]?\d*(\s*(och|and|,)\s*\*?[a-zA-ZāīūĀĪŪ'-]+\*?\s*\d+[:/]?\d*)*$/i
  if (hadithRefPattern.test(definition)) {
    return false
  }

  // Short numeric references are not definitions
  if (definition.length < 15 && /^\d/.test(definition)) {
    return false
  }

  // For Swedish terms, accept short Arabic transliterations (e.g., "wuḍū'", "du'ā")
  if (isSwedishTerm) {
    return definition.length >= 3
  }

  // For Arabic terms, must have some explanatory text (10+ chars)
  return definition.length >= 10
}

function migrateContent(
  content: string,
  options: CLIOptions
): { newContent: string; removedRefs: number; modifiedTerms: string[] } {
  const refs = findGlossaryFootnoteRefs(content)
  const modifiedTerms: string[] = []
  let newContent = content
  let removedRefs = 0

  // Track which footnote IDs we're removing
  const removedFootnoteIds = new Set<string>()

  // Process in reverse order to maintain indices
  for (let i = refs.length - 1; i >= 0; i--) {
    const ref = refs[i]
    const definition = getFootnoteDefinition(newContent, ref.footnoteId)

    // Only remove if this footnote is a definition (not a hadith reference)
    // Swedish terms (non-italic) can have short definitions like "wuḍū'"
    if (isDefinitionFootnote(definition, !ref.isItalic)) {
      const before = newContent.substring(0, ref.index)
      const after = newContent.substring(ref.index + ref.fullMatch.length)

      if (ref.isItalic) {
        // Replace *term*[^n] with just *term*
        newContent = `${before}*${ref.term}*${after}`
      } else {
        // Replace term[^n] with just term (Swedish terms)
        newContent = `${before}${ref.term}${after}`
      }

      removedFootnoteIds.add(ref.footnoteId)
      modifiedTerms.push(ref.term)
      removedRefs++

      if (options.verbose) {
        console.log(`    Removed [^${ref.footnoteId}] after "${ref.term}" (${ref.isItalic ? 'italic' : 'plain'})`)
      }
    }
  }

  return { newContent, removedRefs, modifiedTerms: [...new Set(modifiedTerms)] }
}

async function migrateFile(filePath: string, options: CLIOptions): Promise<MigrationResult | null> {
  const relativePath = path.relative(process.cwd(), filePath)
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const { data: frontmatter, content } = matter(fileContent)
  const { newContent, removedRefs, modifiedTerms } = migrateContent(content, options)

  if (removedRefs === 0) {
    return null
  }

  if (options.dryRun) {
    console.log(`${relativePath}:`)
    console.log(`  Would remove ${removedRefs} glossary footnote ref(s)`)
    console.log(`  Terms: ${modifiedTerms.join(', ')}`)
  } else {
    const newFileContent = matter.stringify(newContent, frontmatter)
    await fs.writeFile(filePath, newFileContent, 'utf-8')
    console.log(`${relativePath}: Removed ${removedRefs} refs (${modifiedTerms.join(', ')})`)
  }

  return {
    file: relativePath,
    removedRefs,
    modifiedTerms,
  }
}

async function main() {
  const options = parseArgs()

  console.log('Glossary Term Migration Script')
  console.log('==============================')
  if (options.dryRun) {
    console.log('Mode: DRY RUN (no files will be modified)\n')
  } else {
    console.log('Mode: LIVE (files will be modified)\n')
  }

  let files: string[]

  if (options.file) {
    const filePath = path.isAbsolute(options.file)
      ? options.file
      : path.join(process.cwd(), options.file)
    files = [filePath]
    console.log(`Processing single file: ${options.file}\n`)
  } else {
    files = await walkDirectory(CONTENT_DIR)
    console.log(`Found ${files.length} markdown files\n`)
  }

  const results: MigrationResult[] = []

  for (const file of files) {
    try {
      const result = await migrateFile(file, options)
      if (result) {
        results.push(result)
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err)
    }
  }

  console.log('\n==============================')
  console.log('Migration Summary')
  console.log('==============================')
  const totalRemoved = results.reduce((sum, r) => sum + r.removedRefs, 0)
  const allTerms = new Set(results.flatMap((r) => r.modifiedTerms))
  console.log(`Files modified: ${results.length}`)
  console.log(`Total refs removed: ${totalRemoved}`)
  console.log(`Unique terms affected: ${allTerms.size}`)

  if (options.dryRun && totalRemoved > 0) {
    console.log('\nRun without --dry-run to apply changes.')
    console.log('After applying, run: pnpm tsx scripts/fix-footnotes.ts')
  } else if (!options.dryRun && totalRemoved > 0) {
    console.log('\nNow run: pnpm tsx scripts/fix-footnotes.ts')
    console.log('This will clean up orphaned footnote definitions.')
  }
}

main().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
