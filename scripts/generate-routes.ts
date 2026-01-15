import fs from 'node:fs/promises'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), 'content')

interface RouteInfo {
  path: string
  type: 'category' | 'subcategory' | 'article'
}

async function getAllRoutes(): Promise<string[]> {
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
          // It's a subcategory
          const subcategorySlug = entry.name
          routes.push(`/${categorySlug}/${subcategorySlug}`)

          // Get articles in subcategory
          const subcategoryPath = path.join(categoryPath, subcategorySlug)
          const articles = await fs.readdir(subcategoryPath, { withFileTypes: true })

          for (const article of articles) {
            if (article.isFile() && article.name.endsWith('.md') && article.name !== '_index.md') {
              const articleSlug = article.name.replace('.md', '')
              routes.push(`/${categorySlug}/${subcategorySlug}/${articleSlug}`)
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
          // It's a direct article in category
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

// Export for use in config
export { getAllRoutes }

// Run directly to print routes
if (import.meta.url === `file://${process.argv[1]}`) {
  getAllRoutes().then((routes) => {
    console.log(JSON.stringify(routes, null, 2))
    console.log(`\nTotal routes: ${routes.length}`)
  })
}
