import { getCollection } from 'astro:content'
import type { APIRoute, GetStaticPaths } from 'astro'
import {
  groupArticles,
  MARKDOWN_HEADERS,
  renderArticle,
  renderCategory,
  renderSubcategory,
} from '~/lib/agent-markdown'

/**
 * Markdown twin of every content route, for AI agents: `/fasta.md`,
 * `/fasta/nattbon.md`, `/fasta/nattbon/<slug>.md`. One endpoint so that a
 * subcategory and an article sharing a path fails the build loudly instead of
 * one silently shadowing the other.
 */
export const getStaticPaths = (async () => {
  const categories = groupArticles(await getCollection('articles'))
  const paths = new Map<string, string>()
  const add = (path: string, body: string) => {
    if (paths.has(path)) throw new Error(`Duplicate Markdown route: /${path}.md`)
    paths.set(path, body)
  }
  for (const category of categories) {
    add(category.slug, renderCategory(category))
    for (const article of category.articles) add(article.id, renderArticle(article, category))
    for (const sub of category.subcategories) {
      add(`${category.slug}/${sub.slug}`, renderSubcategory(category, sub))
      for (const article of sub.articles) add(article.id, renderArticle(article, category, sub))
    }
  }
  return [...paths].map(([path, body]) => ({ params: { path }, props: { body } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) => new Response(props.body, { headers: MARKDOWN_HEADERS })
