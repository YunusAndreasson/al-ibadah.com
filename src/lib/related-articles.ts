export interface RelatedArticle {
  title: string
  author?: string
  href: string
}

/**
 * Simple string hash for deterministic seeding.
 * Returns a 32-bit unsigned integer.
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

/**
 * Seeded pseudo-random shuffle (Fisher-Yates) so results are
 * stable across builds but varied per article.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface Article {
  id: string
  data: { title: string; author?: string }
}

/**
 * Returns up to 3 related articles from the same group
 * (subcategory for 3-segment IDs, category for 2-segment IDs).
 */
export function getRelatedArticles(articleId: string, allArticles: Article[]): RelatedArticle[] {
  const segments = articleId.split('/')
  const depth = segments.length

  const siblings = allArticles.filter((a) => {
    if (a.id === articleId) return false
    const parts = a.id.split('/')
    if (depth === 3) {
      // Same category + subcategory
      return parts.length === 3 && parts[0] === segments[0] && parts[1] === segments[1]
    }
    // Category-level: same category, also 2-segment
    return parts.length === 2 && parts[0] === segments[0]
  })

  if (siblings.length === 0) return []

  const shuffled = seededShuffle(siblings, hashCode(articleId))

  return shuffled.slice(0, 3).map((a) => {
    const parts = a.id.split('/')
    const href =
      parts.length === 3 ? `/${parts[0]}/${parts[1]}/${parts[2]}` : `/${parts[0]}/${parts[1]}`
    return { title: a.data.title, author: a.data.author, href }
  })
}
