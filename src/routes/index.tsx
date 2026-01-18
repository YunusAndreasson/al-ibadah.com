import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '~/components/layout/PageLayout'
import { ContentSection } from '~/components/startpage/ContentSection'
import { useCurrentOccasions } from '~/hooks/useCurrentOccasions'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { sections } = useCurrentOccasions()

  return (
    <PageLayout>
      <div className="pt-2 sm:pt-4">
        {sections.map((section) => (
          <ContentSection key={section.type} section={section} />
        ))}
      </div>
    </PageLayout>
  )
}
