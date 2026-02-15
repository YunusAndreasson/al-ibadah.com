/**
 * Validates Arabic transliteration consistency:
 * 1. Every term in ARABIC_TERMS must match a canonical form in the glossary
 * 2. Every *italicized term* in content that normalizes to a glossary term must use exact canonical spelling
 *
 * Run with: pnpm validate:terms
 */

import fs from 'node:fs'
import path from 'node:path'
import { ARABIC_TERMS } from '../src/lib/content-utils.js'
import { normalizeArabic } from '../src/lib/normalize-arabic.js'

interface ValidationError {
  file: string
  error: string
  line?: number
}

interface ValidationWarning {
  file: string
  message: string
  line?: number
}

const errors: ValidationError[] = []
const warnings: ValidationWarning[] = []

// Load glossary
const glossaryPath = path.join(process.cwd(), 'src/data/italicized-terms.json')
const glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf-8'))

// Build normalized → canonical lookup from glossary
const normalizedToCanonical = new Map<string, string>()
for (const cat of Object.values(glossary.categories) as any[]) {
  for (const term of cat.terms) {
    const norm = normalizeArabic(term.canonical)
    normalizedToCanonical.set(norm, term.canonical)
    for (const v of term.variants) {
      normalizedToCanonical.set(normalizeArabic(v), v)
    }
  }
}

// --- Check 1: ARABIC_TERMS vs glossary ---

for (const [label, termValue] of Object.entries(ARABIC_TERMS)) {
  // Some entries use "x & y" — check each part
  const parts = termValue.includes(' & ') ? termValue.split(' & ') : [termValue]

  for (const part of parts) {
    const norm = normalizeArabic(part)
    const canonical = normalizedToCanonical.get(norm)

    if (!canonical) {
      errors.push({
        file: 'src/lib/content-utils.ts',
        error: `ARABIC_TERMS["${label}"] = "${part}" has no matching glossary entry (normalized: "${norm}")`,
      })
    } else if (canonical !== part) {
      errors.push({
        file: 'src/lib/content-utils.ts',
        error: `ARABIC_TERMS["${label}"] = "${part}" doesn't match canonical "${canonical}" (normalized: "${norm}")`,
      })
    }
  }
}

// --- Check 2: Content italic terms and title terms vs glossary ---

const CONTENT_DIR = path.join(process.cwd(), 'content')
const SKIP_TITLE_NORMALIZED = new Set(['muslim'])

function walkSync(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'granskning' || entry.name === 'information') continue
      files.push(...walkSync(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Check title words against glossary — any Arabic term should use canonical transliteration.
 */
function checkTitle(title: string, relativePath: string): void {
  const parts = title.split(/\s+/)
  for (const part of parts) {
    // Try whole word
    const norm = normalizeArabic(part)
    if (SKIP_TITLE_NORMALIZED.has(norm)) continue
    const canonical = normalizedToCanonical.get(norm)
    if (canonical && canonical !== part && canonical.toLowerCase() !== part.toLowerCase()) {
      // Check with case preservation
      const isUpper = part[0] === part[0].toUpperCase() && part[0] !== part[0].toLowerCase()
      const expected = isUpper
        ? canonical.replace(/\p{Letter}/u, (m) => m.toUpperCase())
        : canonical
      if (expected !== part) {
        warnings.push({
          file: relativePath,
          message: `Title term "${part}" should use canonical "${canonical}"`,
          line: 2,
        })
      }
    }

    // Try hyphenated split
    const hyphenIdx = part.indexOf('-')
    if (hyphenIdx > 0 && hyphenIdx < part.length - 1) {
      const before = part.slice(0, hyphenIdx)
      const bnorm = normalizeArabic(before)
      if (SKIP_TITLE_NORMALIZED.has(bnorm)) continue
      const bcanonical = normalizedToCanonical.get(bnorm)
      if (
        bcanonical &&
        bcanonical !== before &&
        bcanonical.toLowerCase() !== before.toLowerCase()
      ) {
        const isUpper =
          before[0] === before[0].toUpperCase() && before[0] !== before[0].toLowerCase()
        const expected = isUpper
          ? bcanonical.replace(/\p{Letter}/u, (m) => m.toUpperCase())
          : bcanonical
        if (expected !== before) {
          warnings.push({
            file: relativePath,
            message: `Title term "${before}" (in "${part}") should use canonical "${bcanonical}"`,
            line: 2,
          })
        }
      }
    }
  }
}

const italicRegex = /(?<!\*)\*([^*\n]+)\*(?!\*)/g
let contentFilesChecked = 0

for (const filePath of walkSync(CONTENT_DIR)) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(process.cwd(), filePath)
  const lines = content.split('\n')
  let inCodeBlock = false
  contentFilesChecked++

  // Check 2a: Title transliteration
  const titleMatch = content.match(/^title:\s*(?:'([^']*)'|"([^"]*)"|(.+))$/m)
  if (titleMatch) {
    const titleValue = titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]
    if (titleValue && titleValue.trim() !== '>-' && titleValue.trim() !== '|') {
      checkTitle(titleValue, relativePath)
    }
  }

  // Check 2b: Body italic terms
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    let m: RegExpExecArray | null
    italicRegex.lastIndex = 0
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
    while ((m = italicRegex.exec(line)) !== null) {
      const italicText = m[1].trim()
      // Skip very short or very long — likely not Arabic terms
      if (italicText.length < 2 || italicText.length > 40) continue
      // Skip terms containing digits or common Swedish/sentence patterns
      if (/\d/.test(italicText)) continue

      const norm = normalizeArabic(italicText)
      const canonical = normalizedToCanonical.get(norm)

      if (canonical && canonical !== italicText) {
        warnings.push({
          file: relativePath,
          message: `Italic term "${italicText}" should be "${canonical}"`,
          line: i + 1,
        })
      }
    }
  }
}

// --- Check 3: Ayn/hamza confusion in glossary terms ---
// Convention: ayn (ع) = ´ (U+00B4), hamza (ء) = ' (U+2019)
// Terms with known ayn positions — if they contain hamza instead, flag it.

const _AYN = '\u00B4' // ´
const HAMZA = '\u2019' // '

// Arabic roots where the ayn position is known
const KNOWN_AYN_TERMS: Record<string, string> = {
  itikaf: 'i´tikāf — اعتكاف contains ع (ayn)',
  tabiin: 'tābi´īn — تابعين contains ع (ayn)',
  burqa: 'burqa´ — برقع contains ع (ayn)',
  wada: 'wadā´ — الوداع contains ع (ayn)',
  umrah: '´umrah — عمرة starts with ع (ayn)',
  aqidah: '´aqīdah — عقيدة starts with ع (ayn)',
  awrah: '´awrah — عورة starts with ع (ayn)',
  iddah: '´iddah — عدة starts with ع (ayn)',
  arsh: '´Ars̲h — عرش starts with ع (ayn)',
  uluww: '´uluww — علو starts with ع (ayn)',
  eid: '´eid — عيد starts with ع (ayn)',
  arafat: '´Arafāt — عرفات starts with ع (ayn)',
  sai: 'sa´ī — سعي contains ع (ayn)',
  bidah: 'bid´ah — بدعة contains ع (ayn)',
  khushu: 'k̲hus̲hū´ — خشوع ends with ع (ayn)',
  shaban: 's̲ha´bān — شعبان contains ع (ayn)',
}

for (const cat of Object.values(glossary.categories) as any[]) {
  for (const term of cat.terms) {
    const allForms = [term.canonical, ...term.variants]
    for (const form of allForms) {
      const norm = normalizeArabic(form)
      const aynInfo = KNOWN_AYN_TERMS[norm]
      if (aynInfo && form.includes(HAMZA)) {
        errors.push({
          file: 'src/data/italicized-terms.json',
          error: `"${form}" uses hamza (') where ayn (´) is expected: ${aynInfo}`,
        })
      }
    }

    // Also flag self-referencing variants
    for (const v of term.variants) {
      if (v === term.canonical) {
        warnings.push({
          file: 'src/data/italicized-terms.json',
          message: `"${term.canonical}" lists itself in its own variants array`,
        })
      }
    }
  }
}

// --- Output ---

console.log(`Checked ARABIC_TERMS, titles, and ${contentFilesChecked} content files\n`)

if (warnings.length > 0) {
  console.log('\x1b[33m⚠ Warnings:\x1b[0m')
  for (const w of warnings) {
    const lineInfo = w.line ? `:${w.line}` : ''
    console.log(`  ${w.file}${lineInfo}`)
    console.log(`    ${w.message}\n`)
  }
}

if (errors.length > 0) {
  console.log('\x1b[31m✗ Errors:\x1b[0m')
  for (const e of errors) {
    const lineInfo = e.line ? `:${e.line}` : ''
    console.log(`  ${e.file}${lineInfo}`)
    console.log(`    ${e.error}\n`)
  }
  console.log(`\x1b[31m✗ Validation failed with ${errors.length} error(s)\x1b[0m`)
  process.exit(1)
}

console.log('\x1b[32m✓ All Arabic terms are consistent with the glossary\x1b[0m')
