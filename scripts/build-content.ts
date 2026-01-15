/**
 * Build script to generate content JSON from markdown files.
 * This bundles all content at build time for serverless deployment.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'generated', 'content-data.ts')

interface ArticleFrontmatter {
  title: string
  author?: string
  source?: string
  categories: string[]
  original_id?: number
  description?: string
}

interface ArticleData {
  slug: string
  title: string
  author?: string
  source?: string
  categories: string[]
  description?: string
  html: string
  path: string
}

interface SubcategoryData {
  slug: string
  name: string
  articles: ArticleData[]
}

interface CategoryData {
  slug: string
  name: string
  subcategories: SubcategoryData[]
  articles: ArticleData[]
}

const CATEGORY_NAMES: Record<string, string> = {
  troslara: 'Troslära',
  renhet: 'Renhet',
  bon: 'Bön',
  allmosa: 'Allmosa',
  fasta: 'Fasta',
  vallfard: 'Vallfärd',
  blandat: 'Blandat',
  biografier: 'Biografier',
}

async function parseMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel: 'Fotnoter',
      footnoteLabelTagName: 'h2',
    })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(content)
  return String(result)
}

function cleanCategoryName(name: string): string {
  return name
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
}

async function processArticle(
  filePath: string,
  slug: string,
  articlePath: string
): Promise<ArticleData | null> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(fileContent)
    const frontmatter = data as ArticleFrontmatter

    const html = await parseMarkdown(content)

    return {
      slug,
      title: frontmatter.title,
      author: frontmatter.author,
      source: frontmatter.source,
      categories: frontmatter.categories || [],
      description: frontmatter.description,
      html,
      path: articlePath,
    }
  } catch (error) {
    console.error(`Error processing article ${filePath}:`, error)
    return null
  }
}

async function buildContent(): Promise<CategoryData[]> {
  const categories: CategoryData[] = []

  const categoryEntries = await fs.readdir(CONTENT_DIR, { withFileTypes: true })

  for (const categoryEntry of categoryEntries) {
    if (!categoryEntry.isDirectory()) continue

    const categorySlug = categoryEntry.name
    const categoryPath = path.join(CONTENT_DIR, categorySlug)

    const categoryData: CategoryData = {
      slug: categorySlug,
      name: CATEGORY_NAMES[categorySlug] || categorySlug,
      subcategories: [],
      articles: [],
    }

    const entries = await fs.readdir(categoryPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // It's a subcategory
        const subcategorySlug = entry.name
        const subcategoryPath = path.join(categoryPath, subcategorySlug)
        const subcategoryArticles: ArticleData[] = []

        const articleEntries = await fs.readdir(subcategoryPath, { withFileTypes: true })

        for (const articleEntry of articleEntries) {
          if (
            articleEntry.isFile() &&
            articleEntry.name.endsWith('.md') &&
            articleEntry.name !== '_index.md'
          ) {
            const articleSlug = articleEntry.name.replace('.md', '')
            const articleFilePath = path.join(subcategoryPath, articleEntry.name)
            const articlePath = `/${categorySlug}/${subcategorySlug}/${articleSlug}`

            const article = await processArticle(articleFilePath, articleSlug, articlePath)
            if (article) {
              subcategoryArticles.push(article)
            }
          }
        }

        // Get proper subcategory name from first article's frontmatter
        let subcategoryName = subcategorySlug
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        if (subcategoryArticles.length > 0 && subcategoryArticles[0].categories.length >= 2) {
          subcategoryName = cleanCategoryName(subcategoryArticles[0].categories[1])
        }

        categoryData.subcategories.push({
          slug: subcategorySlug,
          name: subcategoryName,
          articles: subcategoryArticles,
        })
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
        // Direct article in category
        const articleSlug = entry.name.replace('.md', '')
        const articleFilePath = path.join(categoryPath, entry.name)
        const articlePath = `/${categorySlug}/${articleSlug}`

        const article = await processArticle(articleFilePath, articleSlug, articlePath)
        if (article) {
          categoryData.articles.push(article)
        }
      }
    }

    categories.push(categoryData)
  }

  return categories
}

async function main() {
  console.log('Building content...')

  const content = await buildContent()

  // Count totals
  let totalArticles = 0
  let totalSubcategories = 0
  for (const cat of content) {
    totalArticles += cat.articles.length
    totalSubcategories += cat.subcategories.length
    for (const sub of cat.subcategories) {
      totalArticles += sub.articles.length
    }
  }

  console.log(
    `Found ${content.length} categories, ${totalSubcategories} subcategories, ${totalArticles} articles`
  )

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE)
  await fs.mkdir(outputDir, { recursive: true })

  // Write TypeScript file
  const output = `// Auto-generated content data - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

export interface ArticleData {
  slug: string
  title: string
  author?: string
  source?: string
  categories: string[]
  description?: string
  html: string
  path: string
}

export interface SubcategoryData {
  slug: string
  name: string
  articles: ArticleData[]
}

export interface CategoryData {
  slug: string
  name: string
  subcategories: SubcategoryData[]
  articles: ArticleData[]
}

export const contentData: CategoryData[] = ${JSON.stringify(content, null, 2)}
`

  await fs.writeFile(OUTPUT_FILE, output, 'utf-8')
  console.log(`Content written to ${OUTPUT_FILE}`)
}

main().catch(console.error)
