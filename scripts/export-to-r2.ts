/**
 * Exports each article as a clean Markdown file into `dist-r2/`, mirroring the
 * site URL structure (e.g. `bon/slug.md` → `/bon/slug`). A short title +
 * category header is prepended to every file so the AI Search retriever gets
 * extra context for each chunk.
 *
 * The output is meant to be uploaded to the R2 bucket that backs the AI Search
 * instance (see `pnpm upload:r2`). AI Search then chunks, embeds and indexes it.
 *
 * Run with: pnpm export:r2
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { CATEGORY_NAMES } from '../src/lib/content-utils'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const OUT_DIR = path.join(process.cwd(), 'dist-r2')

// The 8 content categories — mirrors the glob in src/content.config.ts.
const CATEGORIES = [
  'troslara',
  'renhet',
  'bon',
  'allmosa',
  'fasta',
  'vallfard',
  'blandat',
  'biografier',
]

interface Frontmatter {
  title?: string
  author?: string
  categories?: string[]
}

/** Recursively collect every `.md` file that is not an `_index.md` partial. */
async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        return Promise.resolve([full])
      }
      return Promise.resolve([])
    })
  )
  return nested.flat()
}

async function main() {
  await fs.rm(OUT_DIR, { recursive: true, force: true })
  let count = 0

  for (const category of CATEGORIES) {
    const dir = path.join(CONTENT_DIR, category)
    let files: string[]
    try {
      files = await walk(dir)
    } catch {
      continue // category folder missing — skip
    }

    for (const file of files) {
      const raw = await fs.readFile(file, 'utf8')
      const { data, content } = matter(raw)
      const fm = data as Frontmatter
      if (!fm.title) continue

      // id mirrors Astro's collection id and the site URL: `bon/slug`.
      const id = path.relative(CONTENT_DIR, file).replace(/\.md$/, '')
      const categoryName = CATEGORY_NAMES[category] ?? category
      const contextLine = fm.author
        ? `Kategori: ${categoryName} · Författare: ${fm.author}`
        : `Kategori: ${categoryName}`

      const document = `# ${fm.title}\n\n${contextLine}\n\n${content.trim()}\n`

      const outPath = path.join(OUT_DIR, `${id}.md`)
      await fs.mkdir(path.dirname(outPath), { recursive: true })
      await fs.writeFile(outPath, document)
      count++
    }
  }

  console.log(`Exported ${count} articles to ${path.relative(process.cwd(), OUT_DIR)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
