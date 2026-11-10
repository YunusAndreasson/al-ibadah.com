/**
 * Markdown views of the site for AI agents (ChatGPT, Claude, Perplexity …).
 *
 * Every HTML route that holds content has a Markdown twin at `<path>.md`
 * (`/fasta/nattbon/foo/` → `/fasta/nattbon/foo.md`), and `/llms.txt` maps the
 * whole site. Agents get the source text, footnotes intact, without the HTML
 * chrome. `functions/_middleware.ts` also serves these for `Accept: text/markdown`.
 */
import type { CollectionEntry } from 'astro:content'
import { isNonAuthor } from '~/data/authors'
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_NAMES,
  deriveSubcategoryName,
  getArabicTerm,
} from '~/lib/content-utils'

type Article = CollectionEntry<'articles'>

const SITE_URL = 'https://al-ibadah.com'
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
export const MARKDOWN_HEADERS = { 'Content-Type': 'text/markdown; charset=utf-8' }

export interface Subcategory {
  slug: string
  name: string
  articles: Article[]
}

export interface Category {
  slug: string
  name: string
  description?: string
  subcategories: Subcategory[]
  /** Articles directly under the category (2-segment ids). */
  articles: Article[]
}

const byTitle = (a: Article, b: Article) => a.data.title.localeCompare(b.data.title, 'sv')

/** Groups the collection into categories → subcategories, sorted the way the site lists them. */
export function groupArticles(articles: Article[]): Category[] {
  const categories = new Map<string, Category>()
  for (const article of articles) {
    const [slug, sub] = article.id.split('/')
    let category = categories.get(slug)
    if (!category) {
      category = {
        slug,
        name: CATEGORY_NAMES[slug] || slug,
        description: CATEGORY_DESCRIPTIONS[slug],
        subcategories: [],
        articles: [],
      }
      categories.set(slug, category)
    }
    if (article.id.split('/').length === 2) {
      category.articles.push(article)
      continue
    }
    let subcategory = category.subcategories.find((s) => s.slug === sub)
    if (!subcategory) {
      subcategory = {
        slug: sub,
        name: deriveSubcategoryName(article.data.categories, sub),
        articles: [],
      }
      category.subcategories.push(subcategory)
    }
    subcategory.articles.push(article)
  }
  const order = Object.keys(CATEGORY_NAMES)
  return [...categories.values()]
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((c) => {
      c.articles.sort(byTitle)
      c.subcategories.sort((a, b) => a.name.localeCompare(b.name, 'sv'))
      for (const s of c.subcategories) s.articles.sort(byTitle)
      return c
    })
}

function withTerm(name: string): string {
  const term = getArabicTerm(name)
  return term ? `${name} (${term})` : name
}

function articleLink(article: Article): string {
  const desc = article.data.description ? `: ${article.data.description}` : ''
  return `- [${article.data.title}](${SITE_URL}/${article.id}.md)${desc}`
}

export function renderArticle(article: Article, category: Category, subcategory?: Subcategory) {
  const { title, description, author, source } = article.data
  const meta = [
    author && !isNonAuthor(author) && `- Författare: ${author}`,
    source && `- Källa: ${source}`,
    `- Kategori: ${[category.name, subcategory && withTerm(subcategory.name)].filter(Boolean).join(' › ')}`,
    `- Originalsida: ${SITE_URL}/${article.id}/`,
    `- Licens: CC BY 4.0 (${LICENSE_URL})`,
  ].filter(Boolean)
  return [
    `# ${title}`,
    description && `> ${description}`,
    meta.join('\n'),
    (article.body ?? '').trim(),
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n')
}

export function renderCategory(category: Category): string {
  const parts = [`# ${category.name}`]
  if (category.description) parts.push(`> ${category.description}`)
  parts.push(`Originalsida: ${SITE_URL}/${category.slug}/`)
  if (category.subcategories.length) {
    parts.push(
      '## Underkategorier',
      category.subcategories
        .map(
          (s) =>
            `- [${withTerm(s.name)}](${SITE_URL}/${category.slug}/${s.slug}.md): ${s.articles.length} texter`
        )
        .join('\n')
    )
  }
  if (category.articles.length) {
    parts.push('## Texter', category.articles.map(articleLink).join('\n'))
  }
  return `${parts.join('\n\n')}\n`
}

export function renderSubcategory(category: Category, subcategory: Subcategory): string {
  return `${[
    `# ${withTerm(subcategory.name)}`,
    `Kategori: [${category.name}](${SITE_URL}/${category.slug}.md)`,
    `Originalsida: ${SITE_URL}/${category.slug}/${subcategory.slug}/`,
    '## Texter',
    subcategory.articles.map(articleLink).join('\n'),
  ].join('\n\n')}\n`
}

export function renderLlmsTxt(categories: Category[]): string {
  const catalog = categories
    .map((c) => {
      const head = `- [${c.name}](${SITE_URL}/${c.slug}.md)${c.description ? `: ${c.description}` : ''}`
      const subs = c.subcategories.map(
        (s) => `  - [${withTerm(s.name)}](${SITE_URL}/${c.slug}/${s.slug}.md)`
      )
      return [head, ...subs].join('\n')
    })
    .join('\n')
  const total = categories.reduce(
    (n, c) => n + c.articles.length + c.subcategories.reduce((m, s) => m + s.articles.length, 0),
    0
  )

  return `# al-Ibadah

> En kunskapssamling om islamisk dyrkan och teologi på svenska: ${total} översatta fatwor, artiklar och biografier av sunnitiska lärda, ordnade efter ämne. A Swedish-language library of Islamic rulings (fiqh) and creed, translated from the works of Sunni scholars.

Texterna är översättningar; källan och den lärde anges i varje text. Arabiska termer translittereras konsekvent: ḥ(ح) ṣ(ص) ṭ(ط) ḍ(ض) ẓ(ظ) k̲h(خ) s̲h(ش) t̲h(ث) d̲h(ذ) g̲h(غ), långa vokaler ā ī ū, ´ för ع och ' för ء. Termerna förklaras i ordlistan.

Varje sida finns som Markdown: lägg till \`.md\` på sökvägen (\`/fasta/tarawih/\` → \`/fasta/tarawih.md\`), eller skicka \`Accept: text/markdown\`. Översättningarna är licensierade under CC BY 4.0 (${LICENSE_URL}); ange al-Ibadah och länka till originalsidan.

## Kategorier

${catalog}

## Referens

- [Ordlista](${SITE_URL}/termer/): arabiska termer med translitterering och förklaring
- [Biografier](${SITE_URL}/biografier.md): de lärda vars texter översatts
- [Om al-Ibadah](${SITE_URL}/om/): syfte, källor och licens
- [Samlingsvolym (PDF)](${SITE_URL}/samlingsvolym.pdf): hela samlingen i en fil

## Optional

- [Sitemap](${SITE_URL}/sitemap-index.xml)
- [RSS](${SITE_URL}/rss.xml)
`
}
