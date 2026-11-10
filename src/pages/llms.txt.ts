import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { groupArticles, renderLlmsTxt } from '~/lib/agent-markdown'

/** Site map for AI agents, per https://llmstxt.org. */
export const GET: APIRoute = async () =>
  new Response(renderLlmsTxt(groupArticles(await getCollection('articles'))), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
