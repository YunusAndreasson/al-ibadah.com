import { type CollectionEntry, getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { CATEGORY_NAMES, deriveSubcategoryName, getArabicTerm } from '~/lib/content-utils'
import { renderTitle } from '~/lib/render-title'

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles')
  const searchIndex = articles.map((article: CollectionEntry<'articles'>) => {
    const segments = article.id.split('/')
    const category = segments[0]
    const subcategory = segments.length === 3 ? segments[1] : undefined
    const subcategoryName = subcategory
      ? deriveSubcategoryName(article.data.categories, subcategory)
      : undefined
    return {
      title: article.data.title,
      titleHtml: renderTitle(article.data.title),
      path: `/${article.id}`,
      category: CATEGORY_NAMES[category] || category,
      subcategory: subcategoryName,
      arabicTerm: subcategoryName ? getArabicTerm(subcategoryName) : undefined,
    }
  })

  return new Response(JSON.stringify(searchIndex), {
    headers: { 'Content-Type': 'application/json' },
  })
}
