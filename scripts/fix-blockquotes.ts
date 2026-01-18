/**
 * Fixes empty blockquote lines that incorrectly merge separate quotes.
 * Replaces sequences of empty `>` lines between content blockquotes with blank lines.
 *
 * Run with: pnpm fix:blockquotes
 * Dry run:  pnpm fix:blockquotes:dry
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

interface FixResult {
  file: string
  fixesApplied: number
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
 * Fix empty blockquote lines in content.
 * Pattern: content blockquote, then 1+ empty `>` lines, then another content blockquote
 * Replace empty `>` lines with a single blank line to separate the quotes.
 */
function fixBlockquotes(content: string): { newContent: string; fixes: number } {
  const lines = content.split('\n')
  const result: string[] = []
  let fixes = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Check if this is a blockquote line with content
    if (line.match(/^>\s*.+/)) {
      result.push(line)
      i++

      // Look ahead for empty blockquote lines followed by content blockquote
      const emptyBlockquoteLines: number[] = []
      let j = i

      while (j < lines.length && lines[j].match(/^>\s*$/)) {
        emptyBlockquoteLines.push(j)
        j++
      }

      // Check if followed by another content blockquote
      if (emptyBlockquoteLines.length > 0 && j < lines.length && lines[j].match(/^>\s*.+/)) {
        // Replace empty blockquote lines with a single blank line
        result.push('')
        fixes++
        i = j // Skip to the next content blockquote
      }
      // If empty blockquotes are at the end of a quote block (followed by non-blockquote or EOF)
      else if (emptyBlockquoteLines.length > 0) {
        // Just skip the empty blockquote lines entirely
        fixes++
        i = j
      }
    } else {
      result.push(line)
      i++
    }
  }

  return { newContent: result.join('\n'), fixes }
}

async function fixFile(
  filePath: string,
  options: CLIOptions
): Promise<FixResult | null> {
  const relativePath = path.relative(process.cwd(), filePath)
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const { data: frontmatter, content } = matter(fileContent)
  const { newContent, fixes } = fixBlockquotes(content)

  if (fixes === 0) {
    if (options.verbose) {
      console.log(`  ${relativePath}: No fixes needed`)
    }
    return null
  }

  if (options.dryRun) {
    console.log(`${relativePath}: Would apply ${fixes} fix(es)`)
    if (options.verbose) {
      console.log('--- Preview ---')
      console.log(newContent.slice(0, 500))
      console.log('...')
      console.log('---------------')
    }
  } else {
    const newFileContent = matter.stringify(newContent, frontmatter)
    await fs.writeFile(filePath, newFileContent, 'utf-8')
    console.log(`${relativePath}: Applied ${fixes} fix(es)`)
  }

  return {
    file: relativePath,
    fixesApplied: fixes,
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

  console.log('Blockquote Fix Script')
  console.log('=====================')
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

  console.log('\n=====================')
  console.log('Summary')
  console.log('=====================')
  const totalFixes = results.reduce((sum, r) => sum + r.fixesApplied, 0)
  console.log(`Files with fixes: ${results.length}`)
  console.log(`Total fixes applied: ${totalFixes}`)

  if (options.dryRun && totalFixes > 0) {
    console.log('\nRun without --dry-run to apply changes.')
  }
}

main().catch((err) => {
  console.error('Fix script error:', err)
  process.exit(1)
})
