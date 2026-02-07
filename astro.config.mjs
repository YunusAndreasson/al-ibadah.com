import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkSmartypants from 'remark-smartypants'
import { rehypeQaLabels } from './plugins/rehype-qa-labels.ts'
import { remarkGlossaryTerms } from './plugins/remark-glossary-terms.ts'

export default defineConfig({
  site: 'https://al-ibadah.pages.dev',
  output: 'static',
  prefetch: { defaultStrategy: 'hover' },
  integrations: [react(), sitemap()],
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
