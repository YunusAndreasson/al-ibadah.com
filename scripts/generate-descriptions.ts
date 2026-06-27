/**
 * Regenerate clean meta descriptions from each article's Fråga/Svar.
 *
 * The migrated frontmatter `description` fields are truncated mid-word (e.g.
 * "…mer än vad s…") and several are just the question with no answer — poor for
 * search click-through. This rebuilds them as complete, sentence-bounded ~155-char
 * summaries.
 *
 * Two styles (pick one):
 *   A (qa)     — "Fråga: <q> Svar: <a>"  (matches the searcher's question, current shape)
 *   B (answer) — "<a>"                    (answer-led, less repetitive in the SERP)
 *
 * Usage:
 *   tsx scripts/generate-descriptions.ts --sample        # preview a few, write nothing
 *   tsx scripts/generate-descriptions.ts --write A|B     # apply chosen style to all
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

const CONTENT = 'content'
const CATEGORIES = ['troslara', 'renhet', 'bon', 'allmosa', 'fasta', 'vallfard', 'blandat']
const MAX = 155

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (!e.name.startsWith('_') && e.name.endsWith('.md')) out.push(full)
  }
  return out
}

/** Strip inline markdown to clean prose. */
function clean(text: string): string {
  return text
    .replace(/\[\^[\w-]+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractQA(body: string): { q: string; a: string } | null {
  const m = body.match(/\*\*Fråga:\*\*\s*([\s\S]*?)\*\*Svar:\*\*\s*([\s\S]*?)(?=\n#{1,6}\s|$)/i)
  if (!m?.[1] || !m?.[2]) return null
  const q = clean(m[1])
  const a = clean(m[2])
  return q && a ? { q, a } : null
}

/** Truncate at a sentence end near MAX, else a word boundary; add … if cut. */
function smartTruncate(text: string, max = MAX): string {
  if (text.length <= max) return text
  const window = text.slice(0, max + 1)
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
  if (sentence >= 90) return text.slice(0, sentence + 1)
  const space = window.lastIndexOf(' ')
  return `${text.slice(0, space > 0 ? space : max).trimEnd()}…`
}

function styleA(qa: { q: string; a: string }): string {
  return smartTruncate(`Fråga: ${qa.q} Svar: ${qa.a}`)
}
function styleB(qa: { q: string; a: string }): string {
  return smartTruncate(qa.a)
}

function readFrontmatterDescription(text: string): string | null {
  const fm = text.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) return null
  const line = fm[1].match(/^description:\s*(.+)$/m)
  return line ? line[1].replace(/^['"]|['"]$/g, '').trim() : null
}

const files = CATEGORIES.flatMap((c) => walk(join(CONTENT, c)))
const mode = process.argv[2]

if (mode === '--sample') {
  const picks = [
    'content/blandat/kropp-kladnad/visdomen-bakom-att-man-inte-far-bara-guld.md',
    'content/blandat/ekonomi/lan-baserade-pa-ranta.md',
    'content/bon/begravningsbon/tiden-for-begravningsbonen-och-hur-manga-som-skall.md',
    'content/troslara/innovationer/recitera-koranen-over-gravarna-och-akalla-for-den-.md',
    'content/fasta/vad-som-bryter-eller-inte-bryter-fastan/doftessenser-och-parfymer.md',
  ]
  for (const f of picks) {
    const text = readFileSync(f, 'utf8')
    const body = text.replace(/^---\n[\s\S]*?\n---/, '')
    const qa = extractQA(body)
    const cur = readFrontmatterDescription(text) ?? '(none)'
    console.log(`\n# ${f.replace('content/', '')}`)
    console.log(`  NOW: ${cur.slice(0, 170)}`)
    if (qa) {
      console.log(`  A:   ${styleA(qa)}`)
      console.log(`  B:   ${styleB(qa)}`)
    } else {
      console.log('  (no Fråga/Svar found)')
    }
  }
  // Coverage stats across the whole corpus.
  let withQA = 0
  for (const f of files) {
    const body = readFileSync(f, 'utf8').replace(/^---\n[\s\S]*?\n---/, '')
    if (extractQA(body)) withQA++
  }
  console.log(`\n${withQA}/${files.length} articles have an extractable Fråga/Svar.`)
  process.exit(0)
}

if (mode === '--write' && (process.argv[3] === 'A' || process.argv[3] === 'B')) {
  const style = process.argv[3] === 'A' ? styleA : styleB
  let changed = 0
  let skipped = 0
  let integrity = 0

  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const fm = text.match(/^(---\n)([\s\S]*?)(\n---)/)
    if (!fm) {
      skipped++
      continue
    }
    const body = text.slice(fm[0].length)
    const qa = extractQA(body)
    if (!qa) {
      skipped++
      continue
    }

    const newDesc = style(qa)
    // Replace only the `description` field (block-scalar or quoted) in place,
    // re-emitting it as a single-line single-quoted scalar.
    const fmNew = fm[2].replace(
      /^description:[^\n]*(?:\n[ \t]+[^\n]*)*/m,
      `description: '${newDesc.replace(/'/g, "''")}'`
    )
    if (fmNew === fm[2]) {
      skipped++ // no description field matched
      continue
    }
    const out = fm[1] + fmNew + fm[3] + body

    // Integrity guard: nothing but `description` may change, and the body must be
    // byte-identical. Anything else → skip the file untouched.
    const before = matter(text)
    const after = matter(out)
    const sameKeys =
      JSON.stringify(Object.keys(before.data)) === JSON.stringify(Object.keys(after.data))
    const onlyDesc = Object.keys(before.data).every(
      (k) => k === 'description' || JSON.stringify(before.data[k]) === JSON.stringify(after.data[k])
    )
    if (!sameKeys || !onlyDesc || before.content !== after.content || after.data.description !== newDesc) {
      integrity++
      console.warn(`  ! integrity skip: ${file}`)
      continue
    }

    writeFileSync(file, out)
    changed++
  }

  console.log(
    `✓ ${changed} descriptions rewritten (style ${process.argv[3]}); ` +
      `${skipped} skipped (no Q&A), ${integrity} integrity-skipped`
  )
  process.exit(integrity > 0 ? 1 : 0)
}

console.error('Usage: --sample  |  --write A|B')
process.exit(1)
