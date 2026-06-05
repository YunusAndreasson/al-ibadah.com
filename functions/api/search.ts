/**
 * Pages Function: GET /api/search?q=<query>
 *
 * Brokers a retrieval-only query to the Cloudflare AI Search instance bound as
 * `SEARCH` (see wrangler.jsonc). Returns the most relevant article passages —
 * no LLM generation. One article can produce several chunks; we keep the
 * best-scoring chunk per article and return a short snippet plus the article
 * path (reconstructed from the R2 object key), which the client uses to link
 * back and to look up the title/category from the existing search index.
 *
 * Note: Pages Functions do not run under `astro dev`. Test with
 * `wrangler pages dev dist` (after `pnpm build`) or on a deployed preview.
 */

interface AiSearchChunk {
  text: string
  score: number
  item: { key: string }
}

interface AiSearchResponse {
  chunks?: AiSearchChunk[]
}

interface AiSearchInstance {
  search(options: {
    messages: { role: string; content: string }[]
    ai_search_options?: { retrieval?: { max_num_results?: number } }
  }): Promise<AiSearchResponse>
}

interface Env {
  SEARCH: AiSearchInstance
}

type EventContext = { request: Request; env: Env }

// Retrieve broadly, then collapse to the best chunk per article.
const RETRIEVE = 20
const MAX_RESULTS = 8

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init?.headers },
  })
}

/** Strip the prepended header + markdown markers and trim to a preview length. */
function toSnippet(text: string): string {
  const clean = text
    .replace(/^#.*$/gm, '') // drop heading lines (incl. our title header)
    .replace(/^Kategori:.*$/gm, '') // drop our context header line
    .replace(/[#>*_`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > 280 ? `${clean.slice(0, 280).trimEnd()}…` : clean
}

export async function onRequest(context: EventContext): Promise<Response> {
  const query = new URL(context.request.url).searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return json({ results: [] }, { headers: { 'cache-control': 'no-store' } })
  }

  let chunks: AiSearchChunk[] = []
  try {
    const result = await context.env.SEARCH.search({
      messages: [{ role: 'user', content: query }],
      ai_search_options: { retrieval: { max_num_results: RETRIEVE } },
    })
    chunks = result.chunks ?? []
  } catch {
    return json({ results: [], error: 'search_unavailable' }, { status: 502 })
  }

  // Keep the highest-scoring chunk per source article.
  const byPath = new Map<string, { path: string; snippet: string; score: number }>()
  for (const chunk of chunks) {
    const path = `/${chunk.item.key.replace(/\.md$/, '')}`
    const existing = byPath.get(path)
    if (!existing || chunk.score > existing.score) {
      byPath.set(path, { path, snippet: toSnippet(chunk.text), score: chunk.score })
    }
  }

  const results = [...byPath.values()].sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)

  return json({ results }, { headers: { 'cache-control': 'public, max-age=300' } })
}
