import { type ArticleData, contentData } from '~/generated/content-data'
import type { Article } from './markdown'

export interface SubcategoryInfo {
  slug: string
  name: string
  articleCount: number
}

export interface ArticleListItem {
  slug: string
  title: string
  author?: string
  description?: string
  path: string
}

export async function getArticle(
  category: string,
  subcategory: string | undefined,
  slug: string
): Promise<Article | null> {
  const cat = contentData.find((c) => c.slug === category)
  if (!cat) return null

  let article: ArticleData | undefined

  if (subcategory) {
    const sub = cat.subcategories.find((s) => s.slug === subcategory)
    if (!sub) return null
    article = sub.articles.find((a) => a.slug === slug)
  } else {
    article = cat.articles.find((a) => a.slug === slug)
  }

  if (!article) return null

  return {
    slug: article.slug,
    frontmatter: {
      title: article.title,
      author: article.author,
      source: article.source,
      categories: article.categories,
      description: article.description,
    },
    html: article.html,
    path: article.path,
  }
}

export async function getCategoryInfo(category: string): Promise<{
  name: string
  subcategories: SubcategoryInfo[]
  articles: ArticleListItem[]
} | null> {
  const cat = contentData.find((c) => c.slug === category)
  if (!cat) return null

  return {
    name: cat.name,
    subcategories: cat.subcategories.map((sub) => ({
      slug: sub.slug,
      name: sub.name,
      articleCount: sub.articles.length,
    })),
    articles: cat.articles.map(toArticleListItem),
  }
}

export async function getSubcategoryInfo(
  category: string,
  subcategory: string
): Promise<{
  categoryName: string
  subcategoryName: string
  articles: ArticleListItem[]
} | null> {
  const cat = contentData.find((c) => c.slug === category)
  if (!cat) return null

  const sub = cat.subcategories.find((s) => s.slug === subcategory)
  if (!sub) return null

  return {
    categoryName: cat.name,
    subcategoryName: sub.name,
    articles: sub.articles.map(toArticleListItem),
  }
}

function toArticleListItem(article: ArticleData): ArticleListItem {
  return {
    slug: article.slug,
    title: article.title,
    author: article.author,
    description: article.description,
    path: article.path,
  }
}

export interface SearchItem {
  title: string
  path: string
  category: string
  subcategory?: string
}

export function getSearchIndex(): SearchItem[] {
  const items: SearchItem[] = []

  for (const cat of contentData) {
    for (const article of cat.articles) {
      items.push({
        title: article.title,
        path: article.path,
        category: cat.name,
      })
    }
    for (const sub of cat.subcategories) {
      for (const article of sub.articles) {
        items.push({
          title: article.title,
          path: article.path,
          category: cat.name,
          subcategory: sub.name,
        })
      }
    }
  }

  return items
}
