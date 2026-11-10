import { execSync } from 'node:child_process'

/**
 * Maps each content article (by URL-path id, e.g. `fasta/tarawih/foo`) to the
 * date of its most recent git commit. Feeds the sitemap's <lastmod> and the
 * articles' JSON-LD `dateModified`. Runs git once per process; degrades to an
 * empty map when history is unavailable (e.g. a shallow CI checkout).
 */
function buildLastmodMap(): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const out = execSync(
      'git log --no-merges --date=short --format=COMMIT:%cd --name-only -- content',
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
    )
    let date: string | null = null
    for (const line of out.split('\n')) {
      if (line.startsWith('COMMIT:')) {
        date = line.slice(7)
      } else if (date && line.startsWith('content/') && line.endsWith('.md')) {
        const id = line.slice(8, -3) // strip 'content/' prefix and '.md' suffix
        if (!map.has(id)) map.set(id, date) // newest commit first → first wins
      }
    }
  } catch {
    // No git history available — skip lastmod entirely.
  }
  return map
}

let cache: Map<string, string> | undefined

export function lastmodFor(id: string): string | undefined {
  cache ??= buildLastmodMap()
  return cache.get(id)
}
