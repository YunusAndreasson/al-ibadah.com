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
 * Pages Functions do not run under `astro dev`; test with `wrangler pages dev dist`.
 */
import { legacyRedirects } from '../src/data/legacy-redirects'

const APEX = 'https://al-ibadah.com'
const LEGACY_PATHS = new Set(['/index.php', '/admin/index.php'])

type Context = { request: Request; next: () => Promise<Response> }

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

  return context.next()
}
