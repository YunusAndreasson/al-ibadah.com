import type { CompactArticle } from '~/lib/content-selection/types'
import { stripMarkdown } from '~/lib/markdown'

interface ContentCardProps {
  article: CompactArticle
  featured?: boolean
}

export function ContentCard({ article, featured }: ContentCardProps) {
  const description = featured
    ? article.questionText ||
      (article.description ? stripMarkdown(article.description) : undefined)
    : article.description
      ? stripMarkdown(article.description)
      : undefined

  return (
    <a
      href={`/${article.id}`}
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
    </a>
  )
}
