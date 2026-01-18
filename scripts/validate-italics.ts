/**
 * Validates and corrects italicization of Arabic/Islamic terms.
 * Run with: pnpm tsx scripts/validate-italics.ts [--fix]
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const TERMS_FILE = path.join(process.cwd(), 'src/data/italicized-terms.json')

interface Term {
  canonical: string
  variants: string[]
}

interface Category {
  description: string
  terms: Term[]
}

interface TermsData {
  description: string
  categories: Record<string, Category>
}

interface Inconsistency {
  file: string
  line: number
  term: string
  context: string
  suggestion: string
}

// Words that should never be italicized when standalone
const EXCLUDED_WORDS = new Set([
  'och', 'for', 'eller', 'att', 'den', 'det', 'en', 'ar', 'var', 'till',
  'som', 'av', 'pa', 'under', 'om', 'med', 'vid', 'hos', 'i', 'fran',
  'kan', 'bara', 'har', 'nu', 'ett', 'sig', 'denna', 'alla', 'efter',
  'Fraga', 'Svar', 'Ja', 'Nej', 'an', 'sa', 'de', 'vi', 'ni', 'han', 'hon'
])

// Build regex patterns for each term variant
function buildTermPatterns(termsData: TermsData): Map<string, { pattern: RegExp; canonical: string }> {
  const patterns = new Map<string, { pattern: RegExp; canonical: string }>()

  for (const category of Object.values(termsData.categories)) {
    for (const term of category.terms) {
      for (const variant of term.variants) {
        // Skip very short variants or common words
        if (variant.length < 3 || EXCLUDED_WORDS.has(variant.toLowerCase())) {
          continue
        }

        // Create pattern that matches variant NOT within italics or bold
        // This is a simplified approach - we check context in findInconsistencies
        patterns.set(variant, {
          pattern: new RegExp(`\\b${escapeRegex(variant)}\\b`, 'gi'),
          canonical: term.canonical
        })
      }
    }
  }

  return patterns
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Check if a match position is already within italic markers
function isWithinItalics(content: string, matchStart: number, matchEnd: number): boolean {
  // Look backwards for opening * and forwards for closing *
  // Count asterisks to determine if we're inside italics

  const beforeMatch = content.substring(0, matchStart)
  const afterMatch = content.substring(matchEnd)

  // Check if immediately preceded by * (opening italic)
  // and followed by * (closing italic)

  // Simple check: is the match wrapped in *...*?
  // Look for the pattern *..match..* without ** (which is bold)

  // Find the last * before this match (that isn't part of **)
  let lastAsterisk = -1
  for (let i = matchStart - 1; i >= 0; i--) {
    if (content[i] === '*') {
      // Check if it's not part of **
      if (i > 0 && content[i-1] === '*') {
        i-- // Skip bold
        continue
      }
      if (i < content.length - 1 && content[i+1] === '*') {
        continue // Skip bold
      }
      lastAsterisk = i
      break
    }
    // Stop at newline
    if (content[i] === '\n') break
  }

  // Find the first * after this match (that isn't part of **)
  let nextAsterisk = -1
  for (let i = matchEnd; i < content.length; i++) {
    if (content[i] === '*') {
      // Check if it's not part of **
      if (i > 0 && content[i-1] === '*') {
        continue // Skip bold
      }
      if (i < content.length - 1 && content[i+1] === '*') {
        i++ // Skip bold
        continue
      }
      nextAsterisk = i
      break
    }
    // Stop at newline
    if (content[i] === '\n') break
  }

  // If we found both opening and closing, check they form a valid pair
  if (lastAsterisk !== -1 && nextAsterisk !== -1) {
    // Check nothing weird between asterisks
    const between = content.substring(lastAsterisk + 1, nextAsterisk)
    // If there's no newline and the match is within, it's italicized
    if (!between.includes('\n')) {
      return true
    }
  }

  return false
}

// Patterns that indicate a term is part of a proper name/title and should NOT be italicized
const PROPER_NAME_PATTERNS = [
  // Personal names: "Hasan bin X", "Hasan ibn X", "al-Hasan"
  /\bHasan\s+(bin|ibn|al-)/i,
  /\bal-Hasan\b/i,
  // "Muslim World League" and similar organizations
  /\bMuslim\s+(World|League|Association|Council|Community)/i,
  // File names in markdown (like "- [x] shaykh-name.md")
  /\.(md|txt|pdf)\b/,
  // Kebab-case file names
  /[a-z]+-[a-z]+/,
  // Within markdown links
  /\]\([^)]*$/,
]

// Check if the term in context is part of a proper name
function isProperName(term: string, line: string, matchIndex: number): boolean {
  // Get context around the match
  const contextStart = Math.max(0, matchIndex - 30)
  const contextEnd = Math.min(line.length, matchIndex + term.length + 30)
  const context = line.substring(contextStart, contextEnd)

  for (const pattern of PROPER_NAME_PATTERNS) {
    if (pattern.test(context)) {
      return true
    }
  }

  // Check if term is immediately followed by " bin ", " ibn ", or preceded by "al-"
  const afterTerm = line.substring(matchIndex + term.length, matchIndex + term.length + 15)
  const beforeTerm = line.substring(Math.max(0, matchIndex - 10), matchIndex)

  // Hasan as a personal name (not hadith classification)
  // Patterns: "Ali Hasan", "al-Hasan", "Hasan ibn", "Hasan bin", "Hasan ´Abdul"
  if (term.toLowerCase() === 'hasan') {
    // Check if preceded by a name (capital letter word)
    if (beforeTerm.match(/[A-ZÄÖÅ´''][a-zäöå]+\s+$/)) {
      return true // e.g., "'Alī Hasan"
    }
    // Check if followed by a name component
    if (afterTerm.match(/^\s+(bin|ibn|´Abdul|´Abdur|´Abd)/i)) {
      return true
    }
    // Check if preceded by "al-"
    if (beforeTerm.match(/al-$/i)) {
      return true
    }
  }

  // Muslim as part of an organization or followed by a proper noun
  if (term.toLowerCase() === 'muslim') {
    if (afterTerm.match(/^\s+(World|League|Association|Council|Community|Brothers)/i)) {
      return true
    }
  }

  return false
}

// Check if position is within a code block, URL, or other excluded context
function isExcludedContext(content: string, matchStart: number, line: string, term: string): boolean {
  // Check if within a code block (```...```)
  const beforeContent = content.substring(0, matchStart)
  const codeBlockStarts = (beforeContent.match(/```/g) || []).length
  if (codeBlockStarts % 2 !== 0) {
    return true // Inside code block
  }

  // Check if within inline code (`...`)
  // Count backticks on this line before the match
  const lineStart = beforeContent.lastIndexOf('\n') + 1
  const lineBeforeMatch = content.substring(lineStart, matchStart)
  const backticks = (lineBeforeMatch.match(/`/g) || []).length
  if (backticks % 2 !== 0) {
    return true // Inside inline code
  }

  // Check if in a markdown task list or file reference (common in KORREKTURLASNING.md)
  if (line.match(/^\s*-\s*\[[ x]\]/) || line.includes('.md')) {
    return true
  }

  // Check if within a URL
  if (line.match(/https?:\/\/[^\s)]+/)) {
    const urlMatch = line.match(/https?:\/\/[^\s)]+/)
    if (urlMatch && urlMatch.index !== undefined) {
      const lineOffset = matchStart - (content.lastIndexOf('\n', matchStart) + 1)
      if (lineOffset >= urlMatch.index && lineOffset < urlMatch.index + urlMatch[0].length) {
        return true
      }
    }
  }

  // Check if it's part of a proper name
  const lineOffset = matchStart - (content.lastIndexOf('\n', matchStart) + 1)
  if (isProperName(term, line, lineOffset)) {
    return true
  }

  return false
}

async function findInconsistencies(
  patterns: Map<string, { pattern: RegExp; canonical: string }>,
  fix: boolean
): Promise<{ inconsistencies: Inconsistency[]; fixedFiles: number }> {
  const inconsistencies: Inconsistency[] = []
  let fixedFiles = 0

  const files = await walkDirectory(CONTENT_DIR)

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8')
    const relativePath = path.relative(process.cwd(), filePath)

    // Parse frontmatter to get just the content
    const { content: markdownContent } = matter(content)
    const frontmatterEnd = content.indexOf('---', 4) + 3

    let hasChanges = false
    let newContent = content

    // Track all matches to avoid double-processing
    const processedRanges: Array<[number, number]> = []

    for (const [variant, { canonical }] of patterns) {
      const regex = new RegExp(`\\b${escapeRegex(variant)}\\b`, 'g')
      let match: RegExpExecArray | null

      // Reset regex
      regex.lastIndex = 0

      while ((match = regex.exec(markdownContent)) !== null) {
        const absoluteStart = frontmatterEnd + 1 + match.index
        const absoluteEnd = absoluteStart + match[0].length

        // Skip if already processed
        if (processedRanges.some(([s, e]) => absoluteStart >= s && absoluteEnd <= e)) {
          continue
        }

        // Calculate line number
        const contentBeforeMatch = content.substring(0, absoluteStart)
        const lineNumber = contentBeforeMatch.split('\n').length

        // Get the current line for context
        const lines = content.split('\n')
        const currentLine = lines[lineNumber - 1] || ''

        // Skip if in excluded context
        if (isExcludedContext(content, absoluteStart, currentLine, match[0])) {
          continue
        }

        // Skip if already italicized
        if (isWithinItalics(content, absoluteStart, absoluteEnd)) {
          continue
        }

        // Skip if this is part of a bold marker
        const charBefore = absoluteStart > 0 ? content[absoluteStart - 1] : ''
        const charAfter = absoluteEnd < content.length ? content[absoluteEnd] : ''
        if (charBefore === '*' || charAfter === '*') {
          continue
        }

        // Get context (surrounding text)
        const contextStart = Math.max(0, absoluteStart - 30)
        const contextEnd = Math.min(content.length, absoluteEnd + 30)
        const context = content.substring(contextStart, contextEnd).replace(/\n/g, ' ')

        inconsistencies.push({
          file: relativePath,
          line: lineNumber,
          term: match[0],
          context: `...${context}...`,
          suggestion: `*${match[0]}*`
        })

        processedRanges.push([absoluteStart, absoluteEnd])

        if (fix) {
          // Apply fix in newContent
          // We need to track offset changes
          hasChanges = true
        }
      }
    }

    if (fix && hasChanges) {
      // Re-process and apply fixes
      // Sort inconsistencies for this file by position (reverse order to maintain offsets)
      const fileInconsistencies = inconsistencies
        .filter(i => i.file === relativePath)
        .sort((a, b) => b.line - a.line)

      // Apply fixes from end to start
      for (const inc of fileInconsistencies) {
        // Find the term in the content and replace
        const lines = newContent.split('\n')
        const line = lines[inc.line - 1]
        if (line) {
          // Find the exact match in the line
          const termRegex = new RegExp(`(?<!\\*)\\b${escapeRegex(inc.term)}\\b(?!\\*)`, 'g')
          const newLine = line.replace(termRegex, `*${inc.term}*`)
          if (newLine !== line) {
            lines[inc.line - 1] = newLine
            newContent = lines.join('\n')
          }
        }
      }

      if (newContent !== content) {
        await fs.writeFile(filePath, newContent, 'utf-8')
        fixedFiles++
      }
    }
  }

  return { inconsistencies, fixedFiles }
}

async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  const fix = process.argv.includes('--fix')

  console.log('Loading terms dictionary...')
  const termsContent = await fs.readFile(TERMS_FILE, 'utf-8')
  const termsData: TermsData = JSON.parse(termsContent)

  // Count terms
  let termCount = 0
  for (const category of Object.values(termsData.categories)) {
    termCount += category.terms.length
  }
  console.log(`Loaded ${termCount} terms from ${Object.keys(termsData.categories).length} categories\n`)

  // Build patterns
  const patterns = buildTermPatterns(termsData)
  console.log(`Built ${patterns.size} search patterns\n`)

  // Find inconsistencies
  console.log(fix ? 'Finding and fixing inconsistencies...' : 'Finding inconsistencies...')
  const { inconsistencies, fixedFiles } = await findInconsistencies(patterns, fix)

  // Group by file for cleaner output
  const byFile = new Map<string, Inconsistency[]>()
  for (const inc of inconsistencies) {
    const existing = byFile.get(inc.file) || []
    existing.push(inc)
    byFile.set(inc.file, existing)
  }

  // Output results
  if (inconsistencies.length === 0) {
    console.log('\n\x1b[32m✓ No inconsistencies found!\x1b[0m')
  } else {
    console.log(`\n\x1b[33m⚠ Found ${inconsistencies.length} inconsistencies in ${byFile.size} files:\x1b[0m\n`)

    // Show first 50 for brevity
    let shown = 0
    for (const [file, incs] of byFile) {
      if (shown >= 50) {
        console.log(`\n... and ${inconsistencies.length - 50} more`)
        break
      }

      console.log(`\x1b[36m${file}\x1b[0m`)
      for (const inc of incs.slice(0, 5)) {
        console.log(`  Line ${inc.line}: "${inc.term}" should be "${inc.suggestion}"`)
        console.log(`    Context: ${inc.context}`)
        shown++
        if (shown >= 50) break
      }
      if (incs.length > 5) {
        console.log(`  ... and ${incs.length - 5} more in this file`)
        shown += incs.length - 5
      }
      console.log('')
    }

    if (fix) {
      console.log(`\n\x1b[32m✓ Fixed ${fixedFiles} files\x1b[0m`)
    } else {
      console.log('\nRun with --fix to automatically correct these issues')
    }
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
