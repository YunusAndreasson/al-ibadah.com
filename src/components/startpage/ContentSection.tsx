import type { SectionContent } from '~/lib/content-selection'
import { ContentCard } from './ContentCard'

interface ContentSectionProps {
  section: SectionContent
}

export function ContentSection({ section }: ContentSectionProps) {
  if (section.articles.length === 0) {
    return null
  }

  return (
    <section className="mb-12">
      <header className="mb-5 flex items-baseline gap-3 flex-wrap">
        <h2 className="section-label !mt-0 !mb-0">
          {section.titleSv}
        </h2>
        {section.isUpcoming && section.daysUntil !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            om ~{section.daysUntil} dagar
          </span>
        )}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {section.articles.map((article, index) => (
          <ContentCard key={article.path} article={article} featured={index === 0} />
        ))}
      </div>
    </section>
  )
}
