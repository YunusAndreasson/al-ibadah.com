const SITE_URL = 'https://al-ibadah.pages.dev'
const SITE_NAME = 'al-Ibadah'

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'sv',
    description: 'En kunskapssamling om islamisk dyrkan och teologi på svenska.',
  }
}

export function buildBreadcrumbSchema(items: Array<{ label: string; href: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  }
}

interface ArticleOpts {
  title: string
  description?: string
  url: string
  author?: string
}

export function buildArticleSchema(opts: ArticleOpts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    ...(opts.description && { description: opts.description }),
    url: `${SITE_URL}${opts.url}`,
    inLanguage: 'sv',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    ...(opts.author && {
      author: { '@type': 'Person', name: opts.author },
    }),
  }
}

interface FAQPageOpts {
  title: string
  description?: string
  url: string
  question: string
  answer: string
  author?: string
}

export function buildFAQPageSchema(opts: FAQPageOpts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: opts.title,
    ...(opts.description && { description: opts.description }),
    url: `${SITE_URL}${opts.url}`,
    inLanguage: 'sv',
    mainEntity: [
      {
        '@type': 'Question',
        name: opts.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: opts.answer,
        },
      },
    ],
    ...(opts.author && {
      author: { '@type': 'Person', name: opts.author },
    }),
  }
}

interface CollectionPageOpts {
  title: string
  description?: string
  url: string
  itemCount: number
}

export function buildCollectionPageSchema(opts: CollectionPageOpts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.title,
    ...(opts.description && { description: opts.description }),
    url: `${SITE_URL}${opts.url}`,
    inLanguage: 'sv',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    numberOfItems: opts.itemCount,
  }
}

/**
 * Extract question and answer from markdown body.
 * Returns null if the content doesn't follow the Fråga/Svar pattern.
 */
export function extractQA(body: string | undefined): { question: string; answer: string } | null {
  if (!body) return null

  const match = body.match(/\*\*Fråga:\*\*\s*([\s\S]*?)\*\*Svar:\*\*\s*([\s\S]*?)(?=\*\*|##|$)/i)
  if (!match?.[1] || !match?.[2]) return null

  const clean = (text: string) =>
    text
      .replace(/\[\^[\w-]+\]/g, '') // footnote refs
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // italic
      .replace(/\s+/g, ' ')
      .trim()

  const question = clean(match[1])
  const answer = clean(match[2])

  if (!question || !answer) return null
  return { question, answer }
}
