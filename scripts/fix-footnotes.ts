/**
 * Fixes orphaned footnote definitions (defined but never referenced).
 * Removes unused definitions and renumbers remaining footnotes sequentially.
 *
 * Run with: pnpm fix:footnotes
 * Dry run:  pnpm fix:footnotes:dry
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

interface FixResult {
  file: string
  removedFootnotes: number[]
  renumbered: boolean
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

interface FootnoteInfo {
  refs: Set<string>
  defs: Set<string>
  defLines: Map<string, number>
}

/**
 * Analyze footnotes in content
 */
function analyzeFootnotes(content: string): FootnoteInfo {
  const lines = content.split('\n')
  const refs = new Set<string>()
  const defs = new Set<string>()
  const defLines = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Find references [^1], [^2], etc. (not followed by :)
    const refMatches = line.matchAll(/\[\^(\d+)\](?!:)/g)
    for (const match of refMatches) {
      refs.add(match[1])
    }

    // Find definitions [^1]:, [^2]:, etc.
    const defMatch = line.match(/^\[\^(\d+)\]:/)
    if (defMatch) {
      defs.add(defMatch[1])
      defLines.set(defMatch[1], i)
    }
  }

  return { refs, defs, defLines }
}

/**
 * Fix footnotes: remove unreferenced definitions and renumber
 */
function fixFootnotes(
  content: string,
  options: CLIOptions
): { newContent: string; removedFootnotes: number[]; renumbered: boolean } {
  const { refs, defs } = analyzeFootnotes(content)

  // Find unreferenced definitions
  const unreferenced: string[] = []
  for (const def of defs) {
    if (!refs.has(def)) {
      unreferenced.push(def)
    }
  }

  if (unreferenced.length === 0) {
    return { newContent: content, removedFootnotes: [], renumbered: false }
  }

  if (options.verbose) {
    console.log(`    Unreferenced: [^${unreferenced.join('], [^')}]`)
  }

  let newContent = content
  const lines = newContent.split('\n')

  // Remove unreferenced definition lines
  const linesToRemove = new Set<number>()
  for (const id of unreferenced) {
    const { defLines } = analyzeFootnotes(newContent)
    const lineIndex = defLines.get(id)
    if (lineIndex !== undefined) {
      linesToRemove.add(lineIndex)
    }
  }

  // Filter out the lines to remove
  const filteredLines = lines.filter((_, i) => !linesToRemove.has(i))
  newContent = filteredLines.join('\n')

  // Now renumber footnotes to be sequential
  const { refs: newRefs, defs: newDefs } = analyzeFootnotes(newContent)

  // Get sorted list of used footnote numbers
  const usedNumbers = Array.from(newRefs)
    .map((n) => Number.parseInt(n, 10))
    .sort((a, b) => a - b)

  // Create mapping from old to new numbers
  const renumberMap = new Map<string, string>()
  let needsRenumbering = false

  usedNumbers.forEach((oldNum, index) => {
    const newNum = index + 1
    if (oldNum !== newNum) {
      needsRenumbering = true
    }
    renumberMap.set(String(oldNum), String(newNum))
  })

  if (needsRenumbering) {
    if (options.verbose) {
      const mappings = Array.from(renumberMap.entries())
        .filter(([old, newN]) => old !== newN)
        .map(([old, newN]) => `[^${old}] -> [^${newN}]`)
      if (mappings.length > 0) {
        console.log(`    Renumbering: ${mappings.join(', ')}`)
      }
    }

    // Replace from highest to lowest to avoid conflicts
    const sortedOldNums = Array.from(renumberMap.keys())
      .map((n) => Number.parseInt(n, 10))
      .sort((a, b) => b - a)

    for (const oldNum of sortedOldNums) {
      const oldStr = String(oldNum)
      const newStr = renumberMap.get(oldStr)!

      if (oldStr !== newStr) {
        // Use a temporary placeholder to avoid conflicts
        const placeholder = `[^__TEMP_${newStr}__]`

        // Replace references
        newContent = newContent.replace(
          new RegExp(`\\[\\^${oldStr}\\](?!:)`, 'g'),
          placeholder
        )
        // Replace definitions
        newContent = newContent.replace(
          new RegExp(`^\\[\\^${oldStr}\\]:`, 'gm'),
          `[^__TEMP_${newStr}__]:`
        )
      }
    }

    // Replace placeholders with final numbers
    for (const newStr of renumberMap.values()) {
      newContent = newContent.replace(
        new RegExp(`\\[\\^__TEMP_${newStr}__\\]`, 'g'),
        `[^${newStr}]`
      )
    }
  }

  return {
    newContent,
    removedFootnotes: unreferenced.map((n) => Number.parseInt(n, 10)),
    renumbered: needsRenumbering,
  }
}

async function fixFile(
  filePath: string,
  options: CLIOptions
): Promise<FixResult | null> {
  const relativePath = path.relative(process.cwd(), filePath)
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const { data: frontmatter, content } = matter(fileContent)
  const { newContent, removedFootnotes, renumbered } = fixFootnotes(
    content,
    options
  )

  if (removedFootnotes.length === 0) {
    return null
  }

  if (options.dryRun) {
    console.log(`${relativePath}:`)
    console.log(`  Would remove ${removedFootnotes.length} orphaned footnote(s): [^${removedFootnotes.join('], [^')}]`)
    if (renumbered) {
      console.log(`  Would renumber remaining footnotes`)
    }
  } else {
    const newFileContent = matter.stringify(newContent, frontmatter)
    await fs.writeFile(filePath, newFileContent, 'utf-8')
    console.log(
      `${relativePath}: Removed [^${removedFootnotes.join('], [^')}]${renumbered ? ' and renumbered' : ''}`
    )
  }

  return {
    file: relativePath,
    removedFootnotes,
    renumbered,
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

  console.log('Footnote Fix Script')
  console.log('===================')
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

  const results: FixResult[] = []

  for (const file of files) {
    try {
      const result = await fixFile(file, options)
      if (result) {
        results.push(result)
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err)
    }
  }

  console.log('\n===================')
  console.log('Summary')
  console.log('===================')
  const totalRemoved = results.reduce(
    (sum, r) => sum + r.removedFootnotes.length,
    0
  )
  const totalRenumbered = results.filter((r) => r.renumbered).length
  console.log(`Files fixed: ${results.length}`)
  console.log(`Footnotes removed: ${totalRemoved}`)
  console.log(`Files renumbered: ${totalRenumbered}`)

  if (options.dryRun && totalRemoved > 0) {
    console.log('\nRun without --dry-run to apply changes.')
  }
}

main().catch((err) => {
  console.error('Fix script error:', err)
  process.exit(1)
})
