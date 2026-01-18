/**
 * Migrates inline citations to footnotes for improved readability.
 * Citations in blockquotes are preserved.
 *
 * Run with: pnpm migrate:citations
 * Dry run:  pnpm migrate:citations:dry
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

// Matches [*source* number] or [Koranen chapter:verse]
const CITATION_REGEX = /\[(Koranen\s+\d+:\d+(?:\s*–\s*\d+)?|\*[^*]+\*\s+[^\]]+)\]/g

interface MigrationResult {
  file: string
  citationsMigrated: number
  existingFootnotes: number
  newFootnoteStart: number
}

interface CLIOptions {
  dryRun: boolean
  verbose: boolean
  file?: string
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    file: args.find((arg) => arg.startsWith('--file='))?.split('=')[1],
  }
}

/**
 * Find the highest footnote number in the content
 */
function findHighestFootnote(content: string): number {
  const footnoteRefs = content.matchAll(/\[\^(\d+)\]/g)
  let highest = 0
  for (const match of footnoteRefs) {
    const num = Number.parseInt(match[1], 10)
    if (num > highest) highest = num
  }
  return highest
}

/**
 * Check if a line is inside a blockquote
 */
function isBlockquoteLine(line: string): boolean {
  return line.trimStart().startsWith('>')
}

/**
 * Find the position to insert new footnote definitions.
 * Returns the index after existing footnote definitions, or end of content.
 */
function findFootnoteInsertPosition(content: string): number {
  const lines = content.split('\n')
  let lastFootnoteDefIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\[\^\d+\]:/)) {
      lastFootnoteDefIndex = i
    }
  }

  if (lastFootnoteDefIndex === -1) {
    // No existing footnotes, insert at end
    return content.length
  }

  // Find the end of the last footnote definition (might span multiple lines)
  let endIndex = lastFootnoteDefIndex + 1
  while (endIndex < lines.length && lines[endIndex].trim() !== '' && !lines[endIndex].match(/^\[\^\d+\]:/)) {
    endIndex++
  }

  // Calculate character position
  let pos = 0
  for (let i = 0; i < endIndex; i++) {
    pos += lines[i].length + 1 // +1 for newline
  }
  return pos
}

interface CitationMatch {
  fullMatch: string
  citationContent: string
  index: number
  lineNumber: number
  isInBlockquote: boolean
}

/**
 * Find all citations in the content with their positions
 */
function findCitations(content: string): CitationMatch[] {
  const lines = content.split('\n')
  const citations: CitationMatch[] = []
  let charIndex = 0

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const isBlockquote = isBlockquoteLine(line)

    // Find citations on this line
    const matches = line.matchAll(CITATION_REGEX)
    for (const match of matches) {
      citations.push({
        fullMatch: match[0],
        citationContent: match[1],
        index: charIndex + (match.index ?? 0),
        lineNumber: lineNum + 1,
        isInBlockquote: isBlockquote,
      })
    }

    charIndex += line.length + 1 // +1 for newline
  }

  return citations
}

/**
 * Migrate citations in a single file
 */
async function migrateFile(
  filePath: string,
  options: CLIOptions
): Promise<MigrationResult | null> {
  const relativePath = path.relative(process.cwd(), filePath)
  const fileContent = await fs.readFile(filePath, 'utf-8')

  // Parse frontmatter
  const { data: frontmatter, content } = matter(fileContent)

  // Find existing footnotes
  const highestFootnote = findHighestFootnote(content)

  // Find all citations
  const allCitations = findCitations(content)

  // Filter out citations in blockquotes
  const citationsToMigrate = allCitations.filter((c) => !c.isInBlockquote)

  if (citationsToMigrate.length === 0) {
    if (options.verbose) {
      console.log(`  ${relativePath}: No citations to migrate`)
    }
    return null
  }

  // First, assign footnote numbers in order of appearance
  citationsToMigrate.sort((a, b) => a.index - b.index)

  const citationsWithNumbers = citationsToMigrate.map((citation, i) => ({
    ...citation,
    footnoteNumber: highestFootnote + 1 + i,
  }))

  const newFootnotes: string[] = citationsWithNumbers.map(
    (c) => `[^${c.footnoteNumber}]: ${c.citationContent}`
  )

  if (options.verbose) {
    for (const c of citationsWithNumbers) {
      console.log(`  Line ${c.lineNumber}: ${c.fullMatch} -> [^${c.footnoteNumber}]`)
    }
  }

  // Process replacements from back to front to maintain positions
  let newContent = content
  const citationsByIndexDesc = [...citationsWithNumbers].sort(
    (a, b) => b.index - a.index
  )

  for (const citation of citationsByIndexDesc) {
    const footnoteRef = `[^${citation.footnoteNumber}]`
    newContent =
      newContent.slice(0, citation.index) +
      footnoteRef +
      newContent.slice(citation.index + citation.fullMatch.length)
  }

  const footnoteNumber = highestFootnote + citationsToMigrate.length

  // Find where to insert new footnote definitions
  const insertPos = findFootnoteInsertPosition(newContent)

  // Build the footnotes block
  const footnoteBlock = '\n' + newFootnotes.join('\n')

  // Insert footnotes
  newContent =
    newContent.slice(0, insertPos) + footnoteBlock + newContent.slice(insertPos)

  // Reconstruct file with frontmatter
  const newFileContent = matter.stringify(newContent, frontmatter)

  if (options.dryRun) {
    console.log(`\n${relativePath}:`)
    console.log(`  Would migrate ${citationsToMigrate.length} citation(s)`)
    console.log(`  Existing footnotes: ${highestFootnote}`)
    console.log(`  New footnotes: ${highestFootnote + 1} - ${footnoteNumber}`)
    if (options.verbose) {
      console.log('\n--- New footnote definitions ---')
      console.log(newFootnotes.join('\n'))
      console.log('--------------------------------')
    }
  } else {
    await fs.writeFile(filePath, newFileContent, 'utf-8')
    console.log(
      `${relativePath}: Migrated ${citationsToMigrate.length} citation(s)`
    )
  }

  return {
    file: relativePath,
    citationsMigrated: citationsToMigrate.length,
    existingFootnotes: highestFootnote,
    newFootnoteStart: highestFootnote + 1,
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

async function main() {
  const options = parseArgs()

  console.log('Citation Migration Script')
  console.log('=========================')
  if (options.dryRun) {
    console.log('Mode: DRY RUN (no files will be modified)\n')
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

  // Summary
  console.log('\n=========================')
  console.log('Summary')
  console.log('=========================')
  const totalMigrated = results.reduce((sum, r) => sum + r.citationsMigrated, 0)
  console.log(`Files with migrations: ${results.length}`)
  console.log(`Total citations migrated: ${totalMigrated}`)

  if (options.dryRun && totalMigrated > 0) {
    console.log('\nRun without --dry-run to apply changes.')
  }
}

main().catch((err) => {
  console.error('Migration script error:', err)
  process.exit(1)
})
