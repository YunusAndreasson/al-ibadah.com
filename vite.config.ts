import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import fs from 'node:fs/promises'
import path from 'node:path'

// Generate routes for prerendering
async function getAllRoutes(): Promise<string[]> {
  const CONTENT_DIR = path.join(process.cwd(), 'content')
  const routes: string[] = ['/']

  try {
    const categories = await fs.readdir(CONTENT_DIR, { withFileTypes: true })

    for (const category of categories) {
      if (!category.isDirectory()) continue

      const categorySlug = category.name
      routes.push(`/${categorySlug}`)

      const categoryPath = path.join(CONTENT_DIR, categorySlug)
      const categoryEntries = await fs.readdir(categoryPath, { withFileTypes: true })

      for (const entry of categoryEntries) {
        if (entry.isDirectory()) {
          const subcategorySlug = entry.name
          routes.push(`/${categorySlug}/${subcategorySlug}`)

          const subcategoryPath = path.join(categoryPath, subcategorySlug)
          const articles = await fs.readdir(subcategoryPath, { withFileTypes: true })

          for (const article of articles) {
            if (article.isFile() && article.name.endsWith('.md') && article.name !== '_index.md') {
              const articleSlug = article.name.replace('.md', '')
              routes.push(`/${categorySlug}/${subcategorySlug}/${articleSlug}`)
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
          const articleSlug = entry.name.replace('.md', '')
          routes.push(`/${categorySlug}/${articleSlug}`)
        }
      }
    }
  } catch (error) {
    console.error('Error generating routes:', error)
  }

  return routes
}

const prerenderRoutes = await getAllRoutes()
console.log(`Found ${prerenderRoutes.length} routes to prerender`)

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    nitro({
      preset: 'cloudflare_pages',
      output: {
        dir: '.output',
      },
      compressPublicAssets: true,
      minify: true,
    }),
  ],
  build: {
    // Optimize for production
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    // Better tree shaking
    modulePreload: {
      polyfill: false, // Modern browsers only
    },
    rollupOptions: {
      output: {
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
})
