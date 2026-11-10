/**
 * Pages Functions middleware — SEO continuity for the migrated site.
 *
 * Runs on every request (root `_middleware`). Two jobs, then it falls straight
 * through to `next()` for the common case (static page / asset):
 *
 *  1. Legacy URLs. The pre-migration PHP site served ~20 years of indexed,
 *     back-linked articles at `/index.php?article=<id>` (and older
 *     `/admin/index.php?article=<id>`). The Astro rebuild changed every URL with
 *     no redirects, so those URLs now 404 and the site lost its rankings. We 301
 *     each known id to its current path via the generated map. Unknown ids fall
 *     through to a real 404 (never a soft 404 to the homepage).
 *
 *  2. Host canonicalization. `www.al-ibadah.com` and `al-ibadah.com` both resolved
 *     200 (duplicate host, split signals). We 301 `www.` → apex, preserving the
 *     path and query so Google consolidates on the canonical host.
 *
 * Legacy lookup runs before the host check so a `www` legacy URL reaches its
 * target in a single hop (the apex redirect would otherwise add a second hop).
 *
 *  3. Markdown for AI agents. Every content route has a static Markdown twin at
 *     `<path>.md` (src/lib/agent-markdown.ts). A request that prefers
 *     `Accept: text/markdown` gets that twin at the HTML URL (`/` → `/llms.txt`).
 *     This is content negotiation on the Accept header, never User-Agent
 *     sniffing, so humans and bots get the same text. Negotiable HTML responses
 *     carry `Vary: Accept`, and the `.md` files point back to their HTML page with
 *     a canonical Link header so search engines don't index them as duplicates.
 *
 * Pages Functions do not run under `astro dev`; test with `wrangler pages dev dist`.
 */
import { legacyRedirects } from '../src/data/legacy-redirects'

const APEX = 'https://al-ibadah.com'
const LEGACY_PATHS = new Set(['/index.php', '/admin/index.php'])

type Context = {
  request: Request
  env: { ASSETS: { fetch: (input: Request | URL | string) => Promise<Response> } }
  next: () => Promise<Response>
}

/** q-value the Accept header gives `type` (exact or `type/*` match; the catch-all is ignored). */
function acceptQ(accept: string, type: string): number {
  let q = 0
  for (const part of accept.split(',')) {
    const [range, ...params] = part.trim().toLowerCase().split(';')
    if (range !== type && range !== `${type.split('/')[0]}/*`) continue
    const qParam = params.find((p) => p.trim().startsWith('q='))
    q = Math.max(q, qParam ? Number.parseFloat(qParam.trim().slice(2)) || 0 : 1)
  }
  return q
}

/** True when the client asks for Markdown over HTML. Browsers never send text/markdown. */
function prefersMarkdown(request: Request): boolean {
  const accept = request.headers.get('Accept') ?? ''
  const md = acceptQ(accept, 'text/markdown')
  return md > 0 && md >= acceptQ(accept, 'text/html')
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const out = new Response(response.body, response)
  for (const [name, value] of Object.entries(headers)) {
    // Vary and Link accumulate: _headers already sets the site-wide llms.txt Link.
    if (name === 'Vary' || name === 'Link') out.headers.append(name, value)
    else out.headers.set(name, value)
  }
  return out
}

export async function onRequest(context: Context): Promise<Response> {
  const url = new URL(context.request.url)

  // 1. Legacy ?article=<id> → current path (single hop; also lands on the apex host).
  if (LEGACY_PATHS.has(url.pathname)) {
    const id = url.searchParams.get('article')
    const target = id ? legacyRedirects[id] : undefined
    if (target) return Response.redirect(APEX + target, 301)
    // Unknown/missing id: fall through so Pages serves a genuine 404.
  }

  // 2. www.al-ibadah.com → al-ibadah.com (keep path + query).
  if (url.hostname.startsWith('www.')) {
    return Response.redirect(APEX + url.pathname + url.search, 301)
  }

  // 3. Markdown twins. Only extension-less routes (pages) and .md files; assets pass untouched.
  const path = url.pathname
  if (path.endsWith('.md')) {
    const response = await context.next()
    if (!response.ok) return response
    const canonical = `${APEX}${path.slice(0, -3)}/`
    return withHeaders(response, { Link: `<${canonical}>; rel="canonical"` })
  }
  if (/\.[a-z0-9]+$/i.test(path)) return context.next()

  if (prefersMarkdown(context.request)) {
    const twin = path === '/' ? '/llms.txt' : `${path.replace(/\/+$/, '')}.md`
    const markdown = await context.env.ASSETS.fetch(new URL(twin, url))
    if (markdown.ok) {
      const body = await markdown.text()
      return withHeaders(new Response(body, markdown), {
        'Content-Type':
          twin === '/llms.txt' ? 'text/plain; charset=utf-8' : 'text/markdown; charset=utf-8',
        Vary: 'Accept',
        // Rough token count (~4 chars/token) so an agent can budget before reading.
        'x-markdown-tokens': String(Math.ceil(body.length / 4)),
      })
    }
  }
  const response = await context.next()
  return response.headers.get('Content-Type')?.startsWith('text/html')
    ? withHeaders(response, { Vary: 'Accept' })
    : response
}
