import { Link } from '@tanstack/react-router'
import type { ArticleData } from '~/generated/content-data'
import { stripMarkdown } from '~/lib/markdown'

interface ContentCardProps {
  article: ArticleData
  featured?: boolean
}

/**
 * Extract the question text from article HTML (everything before "Svar:")
 */
function extractQuestion(html: string): string | undefined {
  // Find content between Fråga: and Svar:
  const questionMatch = html.match(
    /<strong[^>]*>Fråga:<\/strong>\s*([\s\S]*?)(?=<strong[^>]*>Svar:<\/strong>|$)/i
  )

  if (questionMatch?.[1]) {
    // Strip HTML tags and clean up
    const text = questionMatch[1]
      .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // Remove footnote refs entirely
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text || undefined
  }

  return undefined
}

export function ContentCard({ article, featured }: ContentCardProps) {
  // For featured cards, extract the full question from HTML
  // Fall back to description if no question pattern found
  const description = featured
    ? extractQuestion(article.html) ||
      (article.description ? stripMarkdown(article.description) : undefined)
    : article.description
      ? stripMarkdown(article.description)
      : undefined

  return (
    <Link
      to={article.path}
      className={`card block group ${featured ? 'sm:col-span-2 sm:py-6' : ''}`}
    >
      <h3
        className={`font-sans font-semibold leading-snug mb-2 group-hover:text-foreground transition-colors ${
          featured ? 'text-lg' : 'text-base'
        }`}
      >
        {article.title}
      </h3>
      {description && (
        <p
          className={`text-muted-foreground ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}
        >
          {description}
        </p>
      )}
      {article.author && (
        <p className="text-xs text-muted-foreground/70 mt-2 truncate">{article.author}</p>
      )}
    </Link>
  )
}
