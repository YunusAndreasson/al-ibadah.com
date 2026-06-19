import { execSync } from 'node:child_process'
import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkSmartypants from 'remark-smartypants'
import { rehypeQaLabels } from './plugins/rehype-qa-labels.ts'
import { remarkGlossaryTerms } from './plugins/remark-glossary-terms.ts'

// Map each content article (by URL-path id) to its most recent git commit date,
// so the sitemap can emit <lastmod> and help search engines schedule crawls.
// Runs once at build time; degrades gracefully when git history is unavailable
// (e.g. a shallow CI checkout).
function buildLastmodMap() {
  const map = new Map()
  try {
    const out = execSync(
      'git log --no-merges --date=short --format=COMMIT:%cd --name-only -- content',
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
    )
    let date = null
    for (const line of out.split('\n')) {
      if (line.startsWith('COMMIT:')) {
        date = line.slice(7)
      } else if (date && line.startsWith('content/') && line.endsWith('.md')) {
        const id = line.slice(8, -3) // strip 'content/' prefix and '.md' suffix
        if (!map.has(id)) map.set(id, date) // newest commit first → first wins
      }
    }
  } catch {
    // No git history available — skip lastmod entirely.
  }
  return map
}

const lastmodById = buildLastmodMap()

export default defineConfig({
  site: 'https://al-ibadah.com',
  output: 'static',
  prefetch: { defaultStrategy: 'hover' },
  integrations: [
    preact(),
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/^\/|\/$/g, '')
        const lastmod = lastmodById.get(path)
        if (lastmod) item.lastmod = lastmod
        return item
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': '/src',
      },
    },
  },
  markdown: {
    remarkPlugins: [
      remarkGfm,
      [remarkSmartypants, { quotes: true, dashes: 'oldschool', ellipses: true, backticks: true }],
      remarkGlossaryTerms,
    ],
    rehypePlugins: [rehypeRaw, rehypeSlug, rehypeQaLabels],
    remarkRehype: {
      allowDangerousHtml: true,
      footnoteLabel: 'Fotnoter',
      footnoteLabelProperties: { className: ['sr-only'] },
    },
  },
})
