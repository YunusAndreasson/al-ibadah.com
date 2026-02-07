/**
 * Replaces archaic Swedish pronouns "denne"/"dennes" with modern equivalents.
 *
 * Replacement rules (in order):
 *   1. "dennes"        → "personens"   (possessive — first to avoid partial match)
 *   2. "denne man"     → "mannen"      (demonstrative + noun)
 *   3. "denne person"  → "personen"    (demonstrative + noun)
 *   4. "denne imam"    → "imamen"      (demonstrative + noun)
 *   5. "denne"         → "personen"    (remaining standalone — last)
 *
 * Run with: pnpm replace:pronouns
 * Dry run:  pnpm replace:pronouns:dry
 * Single:   pnpm replace:pronouns:dry --file=content/path/to/file.md
 */

import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const DRY_RUN = process.argv.includes('--dry-run')
const SINGLE_FILE = process.argv.find((a) => a.startsWith('--file='))?.slice(7)

interface Rule {
  pattern: RegExp
  replacement: string
  label: string
}

/** If original starts with uppercase, capitalize the first letter of replacement. */
function matchCase(replacement: string, original: string): string {
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

/**
 * Rules applied in order. "dennes" must come before "denne" to avoid
 * partial matching ("dennes" → "personens" not "personens" via "denne" + "s").
 */
const RULES: Rule[] = [
  { pattern: /\b[Dd]ennes\b/g, replacement: 'personens', label: 'dennes → personens' },
  { pattern: /\b[Dd]enne man\b/g, replacement: 'mannen', label: 'denne man → mannen' },
  { pattern: /\b[Dd]enne person\b/g, replacement: 'personen', label: 'denne person → personen' },
  { pattern: /\b[Dd]enne imam\b/g, replacement: 'imamen', label: 'denne imam → imamen' },
  { pattern: /\b[Dd]enne\b/g, replacement: 'personen', label: 'denne → personen' },
]

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

function replacePronouns(text: string): { result: string; changes: string[] } {
  const changes: string[] = []
  let result = text

  for (const rule of RULES) {
    result = result.replace(rule.pattern, (matched) => {
      const replaced = matchCase(rule.replacement, matched)
      changes.push(`"${matched}" → "${replaced}"`)
      return replaced
    })
  }

  return { result, changes }
}

function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== REPLACING ARCHAIC PRONOUNS ===')
  console.log()

  let files: string[]
  if (SINGLE_FILE) {
    const resolved = path.resolve(SINGLE_FILE)
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`)
      process.exit(1)
    }
    files = [resolved]
    console.log(`Single file: ${SINGLE_FILE}`)
  } else {
    files = walkDirectory(CONTENT_DIR)
    console.log(`Found ${files.length} content files`)
  }
  console.log()

  let totalChanges = 0
  let filesChanged = 0

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const { result, changes } = replacePronouns(content)

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
