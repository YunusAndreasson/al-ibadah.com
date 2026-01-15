export interface ArticleFrontmatter {
  title: string
  author?: string
  source?: string
  categories: string[]
  original_id?: number
  description?: string
}

export interface Article {
  frontmatter: ArticleFrontmatter
  html: string
  slug: string
  path: string
}
