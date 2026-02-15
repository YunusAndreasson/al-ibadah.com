import type { SectionContent } from '~/lib/content-selection/types'
import { ContentCard } from './ContentCard'

interface ContentSectionProps {
  section: SectionContent
  index?: number
}

export function ContentSection({ section, index = 0 }: ContentSectionProps) {
  if (section.articles.length === 0) {
    return null
  }

  return (
    <section className="mb-12 animate-fade-up" style={{ animationDelay: `${(index + 1) * 60}ms` }}>
      <header className="mb-5 flex items-baseline gap-3 flex-wrap">
        <h2 className="section-label">{section.titleSv}</h2>
        {section.isUpcoming && section.daysUntil !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            om ~{section.daysUntil} {section.daysUntil === 1 ? 'dag' : 'dagar'}
          </span>
        )}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {section.articles.map((article, index) => (
          <ContentCard key={article.id} article={article} featured={index === 0} />
        ))}
      </div>
    </section>
  )
}
