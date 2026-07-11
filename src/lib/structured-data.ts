import { type AuthorEntity, findAuthorEntity, isNonAuthor } from '~/data/authors'

const SITE_URL = 'https://al-ibadah.com'
const SITE_NAME = 'al-Ibadah'

/**
 * schema.org author node for a byline. A recognised scholar resolves to a rich
 * Person/Organization carrying their biography URL and verified Wikidata/Wikipedia
 * `sameAs`; an unrecognised but real byline still gets a basic Person; placeholder
 * bylines ("n/a", "Sammanställning") yield nothing.
 */
function buildAuthorNode(author?: string) {
  if (!author || isNonAuthor(author)) return undefined
  const entity = findAuthorEntity(author)
  if (!entity) return { '@type': 'Person', name: author }
  return {
    '@type': entity.type,
    name: entity.name,
    ...(entity.bioSlug && { url: `${SITE_URL}/biografier/${entity.bioSlug}/` }),
    ...(entity.type === 'Person' && entity.jobTitle && { jobTitle: entity.jobTitle }),
    ...(entity.birthDate && { birthDate: entity.birthDate }),
    ...(entity.deathDate && { deathDate: entity.deathDate }),
    sameAs: entity.sameAs,
  }
}

/** Marks an article as a translation based on the original scholarly work. */
function buildSourceNode(source?: string) {
  return source ? { isBasedOn: { '@type': 'CreativeWork', name: source } } : undefined
}

// Reusable publisher node, nested inside other schemas (no @context here).
const PUBLISHER = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/favicon.svg`,
  },
}

// The person who builds and maintains the site. Same @id across every one of his
// projects so search engines consolidate the identity; personal socials live here
// as `sameAs`, never on the Organization node.
const MAKER_ID = 'https://andreassonphoto.com/#person'

/**
 * The maker's Person node. Emitted once per site (homepage graph) and referenced
 * by the Organization via `creator`. The @id is identical on every project.
 */
export function buildMakerSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': MAKER_ID,
    name: 'Yunus Andreasson',
    alternateName: ['Jonas Yūnus Andrèasson'],
    url: 'https://andreassonphoto.com',
    sameAs: [
      'https://github.com/YunusAndreasson',
      'https://x.com/YunusAndreasson',
      'https://www.instagram.com/andreasson.photo/',
      'https://www.linkedin.com/in/yunusandreasson/',
    ],
  }
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    ...PUBLISHER,
    creator: { '@id': MAKER_ID },
  }
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'sv',
    description: 'En kunskapssamling om islamisk dyrkan och teologi på svenska.',
    publisher: PUBLISHER,
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
  source?: string
}

export function buildArticleSchema(opts: ArticleOpts) {
  const author = buildAuthorNode(opts.author)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    ...(opts.description && { description: opts.description }),
    url: `${SITE_URL}${opts.url}`,
    inLanguage: 'sv',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    publisher: PUBLISHER,
    ...(author && { author }),
    ...buildSourceNode(opts.source),
  }
}

interface FAQPageOpts {
  title: string
  description?: string
  url: string
  question: string
  answer: string
  author?: string
  source?: string
}

export function buildFAQPageSchema(opts: FAQPageOpts) {
  const author = buildAuthorNode(opts.author)
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: opts.title,
    ...(opts.description && { description: opts.description }),
    url: `${SITE_URL}${opts.url}`,
    inLanguage: 'sv',
    publisher: PUBLISHER,
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
    ...(author && { author }),
    ...buildSourceNode(opts.source),
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
 * Standalone Person/Organization schema for a scholar's biography page, turning
 * it into an authoritative author entity (verified `sameAs`) that the articles'
 * author nodes point back to via `url`.
 */
export function buildPersonSchema(entity: AuthorEntity) {
  const url = entity.bioSlug ? `${SITE_URL}/biografier/${entity.bioSlug}/` : SITE_URL
  return {
    '@context': 'https://schema.org',
    '@type': entity.type,
    name: entity.name,
    url,
    sameAs: entity.sameAs,
    ...(entity.type === 'Person' && entity.jobTitle && { jobTitle: entity.jobTitle }),
    ...(entity.birthDate && { birthDate: entity.birthDate }),
    ...(entity.deathDate && { deathDate: entity.deathDate }),
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
