import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '~/components/layout/PageLayout'
import { type GlossaryTerm, glossary } from '~/data/glossary'

export const Route = createFileRoute('/termer')({
  component: TermsPage,
})

// Group terms by category
function groupTermsByCategory(terms: Record<string, GlossaryTerm>) {
  const groups: Record<string, GlossaryTerm[]> = {}

  for (const term of Object.values(terms)) {
    if (!groups[term.category]) {
      groups[term.category] = []
    }
    groups[term.category].push(term)
  }

  // Sort terms alphabetically within each category
  for (const category of Object.keys(groups)) {
    groups[category].sort((a, b) => a.canonical.localeCompare(b.canonical, 'sv'))
  }

  return groups
}

// Category display order
const categoryOrder = [
  'coreTerms',
  'prayerTerms',
  'purificationTerms',
  'fastingTerms',
  'hajjTerms',
  'hajjLocations',
  'zakatTerms',
  'monthNames',
  'familyTerms',
  'clothingTerms',
  'hadithSources',
  'hadithBooks',
  'scholarlyTerms',
  'tawhidTerms',
  'phrases',
  'miswakAndOther',
]

// Swedish category names
const categoryNames: Record<string, string> = {
  coreTerms: 'Grundläggande',
  prayerTerms: 'Bön',
  purificationTerms: 'Renhet',
  fastingTerms: 'Fasta',
  hajjTerms: 'Vallfärd',
  hajjLocations: 'Vallfärdsorter',
  zakatTerms: 'Allmosa',
  monthNames: 'Månader',
  familyTerms: 'Familj och äktenskap',
  clothingTerms: 'Klädsel',
  hadithSources: 'Hadith-källor',
  hadithBooks: 'Hadith-böcker',
  scholarlyTerms: 'Lärdom',
  tawhidTerms: 'Tawhid-kategorier',
  phrases: 'Fraser',
  miswakAndOther: 'Övrigt',
}

function TermsPage() {
  const groupedTerms = groupTermsByCategory(glossary)
  const termCount = Object.keys(glossary).length

  return (
    <PageLayout largePadding>
      <section>
        <div className="prose-reading">
          <h1 className="page-title mb-4">Ordlista</h1>
          <p className="text-muted-foreground mb-8">
            Arabiska termer som förekommer i texterna. {termCount} termer med definitioner.
          </p>

          {categoryOrder.map((categoryKey) => {
            const terms = groupedTerms[categoryKey]
            if (!terms || terms.length === 0) return null

            return (
              <section key={categoryKey} className="mb-8">
                <h2 className="text-lg font-semibold font-sans mb-4 pb-2 border-b border-border">
                  {categoryNames[categoryKey] || categoryKey}
                </h2>
                <dl className="space-y-3">
                  {terms.map((term) => (
                    <div key={term.canonical} className="grid grid-cols-[1fr_2fr] gap-4">
                      <dt className="font-medium">
                        <em>{term.canonical}</em>
                      </dt>
                      <dd className="text-muted-foreground">{term.definition}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )
          })}
        </div>
      </section>
    </PageLayout>
  )
}
