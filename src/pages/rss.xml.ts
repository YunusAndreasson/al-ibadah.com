import { type CollectionEntry, getCollection } from 'astro:content'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
  const articles = await getCollection('articles')
  return rss({
    title: 'al-Ibadah',
    description: 'En kunskapssamling om islamisk dyrkan och teologi på svenska.',
    site: context.site!,
    items: articles.map((article: CollectionEntry<'articles'>) => {
      const parts = article.id.split('/')
      // 2-part: /category/slug, 3-part: /category/subcategory/slug
      const link =
        parts.length === 3 ? `/${parts[0]}/${parts[1]}/${parts[2]}` : `/${parts[0]}/${parts[1]}`
      return {
        title: article.data.title,
        description: article.data.description || '',
        link,
      }
    }),
  })
}
