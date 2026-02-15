import { useMemo } from 'preact/hooks'
import { getStartpageSections } from '~/lib/content-selection/selector'
import type { CompactArticle } from '~/lib/content-selection/types'
import { detectOccasions } from '~/lib/hijri'
import { ContentSection } from './ContentSection'

interface HomepageIslandProps {
  articleData: CompactArticle[]
}

export function HomepageIsland({ articleData }: HomepageIslandProps) {
  const sections = useMemo(() => {
    const now = new Date()
    const occasions = detectOccasions(now)
    const activeOccasionTypes = occasions.map((o) => o.type)
    return getStartpageSections(activeOccasionTypes, articleData, now)
  }, [articleData])

  return (
    <div>
      {sections.map((section, index) => (
        <ContentSection key={section.type} section={section} index={index} />
      ))}
    </div>
  )
}
