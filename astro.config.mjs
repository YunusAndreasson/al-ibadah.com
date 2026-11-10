import { unified } from '@astrojs/markdown-remark'
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
import { lastmodFor } from './src/lib/git-lastmod.ts'

export default defineConfig({
  site: 'https://al-ibadah.com',
  output: 'static',
  prefetch: { defaultStrategy: 'hover' },
  integrations: [
    preact(),
    sitemap({
      // HTML pages only: the .md twins and llms.txt are for agents, not the index.
      filter: (page) => !/\.(md|txt)$/.test(page),
      serialize(item) {
        // <lastmod> from git history helps search engines schedule crawls.
        const path = new URL(item.url).pathname.replace(/^\/|\/$/g, '')
        const lastmod = lastmodFor(path)
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
    // Astro 7 defaults to Sätteri; the glossary and Q&A plugins are remark/rehype
    // plugins, so the content stays on the unified pipeline.
    processor: unified({
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
    }),
  },
})
