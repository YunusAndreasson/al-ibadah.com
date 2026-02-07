import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { CATEGORY_NAMES, deriveSubcategoryName, getArabicTerm } from '~/lib/content-utils'

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles')
  const searchIndex = articles.map((article) => {
    const segments = article.id.split('/')
    const category = segments[0]
    const subcategory = segments.length === 3 ? segments[1] : undefined
    const subcategoryName = subcategory
      ? deriveSubcategoryName(article.data.categories, subcategory)
      : undefined
    return {
      title: article.data.title,
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
