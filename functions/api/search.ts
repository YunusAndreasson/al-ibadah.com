/**
 * Pages Function: GET /api/search?q=<query>
 *
 * Retrieval-only query to the Cloudflare AI Search instance `al-ibadah-search`.
 * No LLM generation — the answer shown to the user is the scholar's actual text.
 *
 * Pages config does not support the dedicated `ai_search` binding (Workers only),
 * so on Pages we reach AI Search through the Workers AI binding (`AI`) via
 * `env.AI.autorag(<instance>)`. We still pass `context_expansion` so the top
 * match comes back as a full, coherent passage (the whole Svar) rather than a
 * 256-token fragment. The exported documents carry a `# Title` /
 * `Kategori: … · Författare: …` header and `**Fråga:** / **Svar:**` structure, so
 * we split the question and answer out of the returned text directly.
 *
 * Response shape:
 *   {
 *     results: [{ path, score, snippet }],   // supporting list (all matches)
 *     answer:  { path, question?, paragraphs[], truncated } | null  // featured top match
 *   }
 *
 * Pages Functions do not run under `astro dev`; test with `wrangler pages dev dist`.
 */

const INSTANCE = 'al-ibadah-search'

// AI Search returns chunks under either `chunks` (dedicated binding shape) or
// `data` (unified/REST shape). We normalise both into one internal shape.
interface RawChunk {
  text?: string
  score?: number
  item?: { key?: string }
  filename?: string
  file_id?: string
  content?: { type?: string; text?: string }[]
}

interface AiSearchResponse {
  chunks?: RawChunk[]
  data?: RawChunk[]
}

interface AutoRagInstance {
  search(options: {
    query?: string
    messages?: { role: string; content: string }[]
    ai_search_options?: {
      retrieval?: { max_num_results?: number; match_threshold?: number; context_expansion?: number }
      reranking?: { enabled?: boolean; model?: string; match_threshold?: number }
    }
  }): Promise<AiSearchResponse>
}

interface Env {
  AI: { autorag(name: string): AutoRagInstance }
}

type EventContext = { request: Request; env: Env }

const RETRIEVE = 20 // candidates to pull before de-duping to one chunk per article
const MAX_RESULTS = 8 // articles returned to the client
const ANSWER_MAX_CHARS = 1200 // cap on the inline featured answer
// Only present a prominent "answer" when the reranker is confident. Reranking
// gives a clean bimodal score split — genuine matches land ~0.85–1.0 while junk
// queries collapse to ~0.0 — so this threshold sits in the empty gap between them
// and stops nonsense queries from showing a confident, wrong answer.
const ANSWER_MIN_SCORE = 0.5

interface NormalChunk {
  text: string
  score: number
  key: string
}

/** Flatten whichever response shape AI Search returns into {text, score, key}. */
function normalizeChunks(result: AiSearchResponse): NormalChunk[] {
  const raw = result.chunks ?? result.data ?? []
  return raw.map((c) => ({
    text:
      typeof c.text === 'string'
        ? c.text
        : Array.isArray(c.content)
          ? c.content.map((p) => p.text ?? '').join('\n')
          : '',
    score: typeof c.score === 'number' ? c.score : 0,
    key: c.item?.key ?? c.filename ?? c.file_id ?? '',
  }))
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init?.headers },
  })
}

/** Strip inline markdown to a single clean line. */
function cleanInline(text: string): string {
  return text
    .replace(/\[\^[\w-]+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip markdown but keep paragraph/line breaks, and drop our injected header. */
function cleanBlock(text: string): string {
  return text
    .replace(/^#.*$/gm, '') // injected title heading
    .replace(/^Kategori:.*$/gm, '') // injected category/author line
    .replace(/^\s*\[\^[\w-]+\]:.*$/gm, '') // footnote definitions
    .replace(/\[\^[\w-]+\]/g, '') // footnote references
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '') // blockquote markers (keep the quoted text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Split a chunk's text into the question (Fråga) and answer (Svar). */
function parseChunk(text: string): { question?: string; answer: string } {
  const svar = text.search(/\*\*Svar:\*\*/i)
  if (svar !== -1) {
    const before = text.slice(0, svar)
    const after = text.slice(svar).replace(/\*\*Svar:\*\*/i, '')
    const fraga = before.match(/\*\*Fråga:\*\*([\s\S]*)/i)
    return {
      question: fraga ? cleanInline(fraga[1]) : undefined,
      answer: cleanBlock(after),
    }
  }
  return { answer: cleanBlock(text) }
}

/** A short one-line snippet for the supporting list. */
function snippetOf(answer: string, max = 180): string {
  const flat = answer.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

/** Answer paragraphs capped at a paragraph boundary near maxChars. */
function paragraphsOf(
  answer: string,
  maxChars: number
): { paragraphs: string[]; truncated: boolean } {
  const lines = answer
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const out: string[] = []
  let total = 0
  for (const line of lines) {
    if (out.length > 0 && total + line.length > maxChars) {
      return { paragraphs: out, truncated: true }
    }
    out.push(line)
    total += line.length
  }
  return { paragraphs: out, truncated: false }
}

export async function onRequest(context: EventContext): Promise<Response> {
  const url = new URL(context.request.url)
  const query = url.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return json({ results: [], answer: null }, { headers: { 'cache-control': 'no-store' } })
  }

  let result: AiSearchResponse
  try {
    result = await context.env.AI.autorag(INSTANCE).search({
      query,
      // Both thresholds default to 0.4 and would silently drop low-score hits;
      // 0 lets reranking ORDER (not drop) results. context_expansion returns the
      // full surrounding passage so the top match is a coherent answer.
      ai_search_options: {
        retrieval: { max_num_results: RETRIEVE, match_threshold: 0, context_expansion: 3 },
        reranking: { enabled: true, model: '@cf/baai/bge-reranker-base', match_threshold: 0 },
      },
    })
  } catch {
    return json({ results: [], answer: null, error: 'search_unavailable' }, { status: 502 })
  }

  const chunks = normalizeChunks(result)

  // Keep the highest-scoring chunk per source article.
  const byPath = new Map<string, { path: string; score: number; text: string }>()
  for (const chunk of chunks) {
    if (!chunk.key) continue
    const path = `/${chunk.key.replace(/\.md$/, '')}`
    const existing = byPath.get(path)
    if (!existing || chunk.score > existing.score) {
      byPath.set(path, { path, score: chunk.score, text: chunk.text })
    }
  }

  const ranked = [...byPath.values()].sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)

  const results = ranked.map((r) => ({
    path: r.path,
    score: r.score,
    snippet: snippetOf(parseChunk(r.text).answer),
  }))

  let answer: {
    path: string
    question?: string
    paragraphs: string[]
    truncated: boolean
  } | null = null
  if (ranked[0] && ranked[0].score >= ANSWER_MIN_SCORE) {
    const parsed = parseChunk(ranked[0].text)
    const { paragraphs, truncated } = paragraphsOf(parsed.answer, ANSWER_MAX_CHARS)
    if (paragraphs.length > 0) {
      answer = { path: ranked[0].path, question: parsed.question, paragraphs, truncated }
    }
  }

  return json({ results, answer }, { headers: { 'cache-control': 'public, max-age=300' } })
}
