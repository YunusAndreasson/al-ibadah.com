/**
 * Validates YAML frontmatter and markdown content in all files.
 * Run with: pnpm validate
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

interface ValidationError {
  file: string
  error: string
  details?: string
  line?: number
}

interface ValidationWarning {
  file: string
  message: string
  line?: number
}

const errors: ValidationError[] = []
const warnings: ValidationWarning[] = []

/**
 * Validates markdown formatting in content
 * Focus on clear-cut errors to minimize false positives
 */
function validateMarkdown(content: string, relativePath: string, frontmatterLines: number): void {
  const lines = content.split('\n')
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = frontmatterLines + i + 1

    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    // Skip blockquotes and list items
    if (line.trim().startsWith('>') || line.match(/^\s*[\*\-]\s/)) continue

    // === BOLD CHECKS ===
    // Look for clearly broken bold patterns:
    // 1. "** word" at start of line or after space/punct = broken opening
    // 2. "word **" before end of line or before space/punct = broken closing

    // Broken opening: (start|space|punct) + ** + space + word
    // This catches "** text**" but not "**text:** more"
    const brokenBoldOpening = line.match(/(^|[\s\(\["])\*\*\s+\w/g)
    if (brokenBoldOpening) {
      errors.push({
        file: relativePath,
        error: `Broken bold: space after opening ** (found: "${brokenBoldOpening[0].trim()}")`,
        line: lineNum,
      })
    }

    // Broken closing: word + space + ** + (end|space|punct)
    // This catches "**text **" but not "**text** more"
    const brokenBoldClosing = line.match(/\w\s+\*\*([\s\)\]".,;:!?]|$)/g)
    if (brokenBoldClosing) {
      errors.push({
        file: relativePath,
        error: `Broken bold: space before closing ** (found: "${brokenBoldClosing[0].trim()}")`,
        line: lineNum,
      })
    }

    // Check for unclosed bold: count ** pairs
    // Ignore custom formatting like [*] or [**] used as bullet points
    const lineWithoutCustomBullets = line.replace(/\[\*+\]/g, '')
    const boldMarkers = lineWithoutCustomBullets.match(/\*\*(?!\*)/g) || []
    if (boldMarkers.length % 2 !== 0) {
      warnings.push({
        file: relativePath,
        message: `Possible unclosed bold marker (**)`,
        line: lineNum,
      })
    }

    // === ITALIC CHECKS ===
    // Similar to bold, but need to avoid:
    // - List items (* item)
    // - Footnotes [^1]
    // - Multiple valid *word* on same line

    // Skip lines with footnotes for italic checking (too many edge cases)
    if (!line.includes('[^')) {
      // Broken opening: (start|space|punct) + * + space + word (not preceded by *)
      // This catches "* text*" but not "*text* more"
      const brokenItalicOpening = line.match(/(^|[\s\(\["])(?<!\*)\*(?!\*)\s+\w/g)
      if (brokenItalicOpening) {
        errors.push({
          file: relativePath,
          error: `Broken italic: space after opening * (found: "${brokenItalicOpening[0].trim()}")`,
          line: lineNum,
        })
      }

      // Broken closing: word + space + * + (end|space|punct) (not followed by *)
      // This catches "*text *" but not "*text* more"
      const brokenItalicClosing = line.match(/\w\s+(?<!\*)\*(?!\*)([\s\)\]".,;:!?]|$)/g)
      if (brokenItalicClosing) {
        errors.push({
          file: relativePath,
          error: `Broken italic: space before closing * (found: "${brokenItalicClosing[0].trim()}")`,
          line: lineNum,
        })
      }
    }

    // === LINK CHECKS ===
    // Check for unclosed link bracket at end of line
    if (line.match(/\[[^\]]*$/) && !line.includes('[^')) {
      warnings.push({
        file: relativePath,
        message: `Possible unclosed link bracket [`,
        line: lineNum,
      })
    }

    // Check for missing closing parenthesis in links
    const linkStarts = (line.match(/\]\(/g) || []).length
    const parenCloses = (line.match(/\)/g) || []).length
    if (linkStarts > parenCloses) {
      warnings.push({
        file: relativePath,
        message: `Possible unclosed link URL (missing closing parenthesis)`,
        line: lineNum,
      })
    }
  }
}

/**
 * Count lines in frontmatter
 */
function countFrontmatterLines(content: string): number {
  const match = content.match(/^---\n[\s\S]*?\n---/)
  if (match) {
    return match[0].split('\n').length
  }
  return 0
}

async function validateFile(filePath: string): Promise<void> {
  const relativePath = path.relative(process.cwd(), filePath)
  const fileName = path.basename(filePath)

  // Skip _index.md files - these are category index pages
  const isIndexFile = fileName === '_index.md'

  try {
    const content = await fs.readFile(filePath, 'utf-8')

    // Check if file has frontmatter
    if (!content.startsWith('---')) {
      errors.push({
        file: relativePath,
        error: 'Missing frontmatter (file should start with ---)',
      })
      return
    }

    // Try to parse frontmatter
    const { data } = matter(content)

    // Validate required fields
    if (!data.title) {
      errors.push({
        file: relativePath,
        error: 'Missing required field: title',
      })
    }

    // Categories are required for articles, but not for index files
    if (!isIndexFile && (!data.categories || !Array.isArray(data.categories) || data.categories.length === 0)) {
      errors.push({
        file: relativePath,
        error: 'Missing or invalid field: categories (must be a non-empty array)',
      })
    }

    // Validate field types
    if (data.title && typeof data.title !== 'string') {
      errors.push({
        file: relativePath,
        error: 'Invalid field type: title must be a string',
      })
    }

    if (data.author && typeof data.author !== 'string') {
      errors.push({
        file: relativePath,
        error: 'Invalid field type: author must be a string',
      })
    }

    if (data.description && typeof data.description !== 'string') {
      errors.push({
        file: relativePath,
        error: 'Invalid field type: description must be a string',
      })
    }

    if (data.original_id && typeof data.original_id !== 'number') {
      warnings.push({
        file: relativePath,
        message: 'original_id should be a number',
      })
    }

    // Validate markdown content
    const { content: markdownContent } = matter(content)
    const frontmatterLines = countFrontmatterLines(content)
    validateMarkdown(markdownContent, relativePath, frontmatterLines)

  } catch (err) {
    const error = err as Error
    // Extract useful info from YAML errors
    let details = error.message
    if (error.name === 'YAMLException') {
      details = error.message
    }

    errors.push({
      file: relativePath,
      error: 'YAML parsing error',
      details,
    })
  }
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
  console.log('Validating content files...\n')

  const files = await walkDirectory(CONTENT_DIR)
  console.log(`Found ${files.length} markdown files to validate\n`)

  for (const file of files) {
    await validateFile(file)
  }

  // Report warnings
  if (warnings.length > 0) {
    console.log('\x1b[33m⚠ Warnings:\x1b[0m')
    for (const warning of warnings) {
      const lineInfo = warning.line ? `:${warning.line}` : ''
      console.log(`  ${warning.file}${lineInfo}`)
      console.log(`    ${warning.message}\n`)
    }
  }

  // Report errors
  if (errors.length > 0) {
    console.log('\x1b[31m✗ Errors:\x1b[0m')
    for (const error of errors) {
      const lineInfo = error.line ? `:${error.line}` : ''
      console.log(`  ${error.file}${lineInfo}`)
      console.log(`    ${error.error}`)
      if (error.details) {
        console.log(`    ${error.details.split('\n').join('\n    ')}`)
      }
      console.log('')
    }

    console.log(`\n\x1b[31m✗ Validation failed with ${errors.length} error(s)\x1b[0m`)
    process.exit(1)
  }

  console.log(`\x1b[32m✓ All ${files.length} files validated successfully\x1b[0m`)
}

main().catch((err) => {
  console.error('Validation script error:', err)
  process.exit(1)
})
