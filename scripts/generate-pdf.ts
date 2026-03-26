/**
 * Generate samlingsvolym.pdf — a collected volume of all articles.
 * Uses Typst for typesetting (true footnotes, Swedish hyphenation,
 * Knuth-Plass line breaking, widow/orphan control).
 *
 * Design: modelled after Swedish literary publishing (Bonniers, Norstedts).
 * Asymmetric margins, running headers, outer page numbers,
 * tight leading, restrained ornament.
 *
 * Usage: tsx scripts/generate-pdf.ts
 */

import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkSmartypants from 'remark-smartypants'
import { unified } from 'unified'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname!, '..')
const CONTENT_DIR = join(ROOT, 'content')
const DIST = join(ROOT, 'dist')
const OUTPUT = join(DIST, 'samlingsvolym.pdf')
const TYPST_PATH = join(DIST, 'samlingsvolym.typ')
const TYPST_BIN = '/home/yunus/.cargo/bin/typst'
const FONT_DIR = '/usr/share/fonts/noto'

// ---------------------------------------------------------------------------
// Ornament SVG (rub el-hizb)
// ---------------------------------------------------------------------------

const ORNAMENT_SVG = `<svg viewBox="0 -2 120 22" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="9" x2="48" y2="9" stroke="#999" stroke-width="0.5" stroke-linecap="round"/>
  <rect x="53" y="2" width="14" height="14" stroke="#999" stroke-width="0.8" fill="none"/>
  <rect x="53" y="2" width="14" height="14" stroke="#999" stroke-width="0.8" fill="none" transform="rotate(45 60 9)"/>
  <circle cx="60" cy="9" r="2" stroke="#999" stroke-width="0.7" fill="none"/>
  <line x1="72" y1="9" x2="120" y2="9" stroke="#999" stroke-width="0.5" stroke-linecap="round"/>
</svg>`

// ---------------------------------------------------------------------------
// Category & subcategory configuration
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = [
  'troslara',
  'renhet',
  'bon',
  'allmosa',
  'fasta',
  'vallfard',
  'blandat',
  'biografier',
]

const CATEGORY_NAMES: Record<string, string> = {
  troslara: 'Troslära',
  renhet: 'Renhet',
  bon: 'Bön',
  allmosa: 'Allmosa',
  fasta: 'Fasta',
  vallfard: 'Vallfärd',
  blandat: 'Blandat',
  biografier: 'Biografier',
}

const ARABIC_TERMS: Record<string, string> = {
  Monoteism: 'tawḥīd',
  Avgudadyrkan: 's̲hirk',
  Innovationer: 'bid´ah',
  Trosbekännelsen: 's̲hahādah',
  'Medel för åkallan': 'tawassul',
  Förutbestämmelsen: 'qadar',
  Gravlivet: 'barzak̲h',
  'Den stora tvagningen': 'g̲husl',
  'Tvagning utan vatten': 'tayammum',
  Tvagning: 'wuḍū\u2019',
  Månadsblödning: 'ḥayḍ',
  Efterblödning: 'nifās',
  'Strykning över strumpor': 'mas̲h',
  Böneutrop: 'ad̲hān',
  'Det andra böneutropet': 'iqāmah',
  'Koncentration i bönen': 'k̲hus̲hū\u2019',
  Nattbön: 'qiyām al-layl',
  'Avskärmning i bönen': 'sutrah',
  Begravningsbön: 'ṣalāt al-janāzah',
  Fredagsbönen: 'ṣalāt al-jumu´ah',
  'Eid-bönen': 'ṣalāt al-´īd',
  Fasteallmosa: 'zakātul-fiṭr',
  'Allmaktens Natt': 'laylat al-qadr',
  'Ramadanens nattbön': 'tarāwīḥ',
  'Vallfärdens stationer': 'mawāqīt',
  'Rundvandring och löpning': 'ṭawāf & sa\u2019ī',
  'Förbud i helgtillståndet': 'iḥrām',
  Pilgrimskläder: 'iḥrām',
  'Helgtillståndet och avsikten': 'iḥrām',
  'Mindre vallfärd': '\u2019umrah',
  Högtidsoffret: 'uḍḥiyah',
}

// ---------------------------------------------------------------------------
// Markdown processor
// ---------------------------------------------------------------------------

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkSmartypants, {
    openingQuotes: { double: '\u00BB', single: '\u2019' },
    closingQuotes: { double: '\u00AB', single: '\u2019' },
    dashes: 'oldschool',
  })

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

interface ArticleMeta {
  title: string
  author: string
  categories: string[]
  description: string
}

function parseFrontmatter(raw: string): { meta: ArticleMeta; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match)
    return { meta: { title: '', author: '', categories: [], description: '' }, body: raw }

  const meta: ArticleMeta = { title: '', author: '', categories: [], description: '' }
  const lines = match[1].split('\n')

  let currentKey = ''
  let collectingMultiline = false

  for (const line of lines) {
    if (/^\s+-\s/.test(line) && currentKey === 'categories') {
      meta.categories.push(line.replace(/^\s+-\s*/, '').trim())
      continue
    }

    const keyMatch = line.match(/^(\w[\w_]*):\s*(.*)$/)
    if (keyMatch) {
      currentKey = keyMatch[1]
      const val = keyMatch[2]
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/^>-?\s*$/, '')

      if (val === '' || val === '>-' || val === '>') {
        collectingMultiline = currentKey === 'description' || currentKey === 'source'
        continue
      }

      collectingMultiline = false

      if (currentKey === 'title') meta.title = val
      else if (currentKey === 'author') meta.author = val
      else if (currentKey === 'description') meta.description = val
      continue
    }

    if (collectingMultiline && line.startsWith('  ')) {
      if (currentKey === 'description') {
        meta.description += (meta.description ? ' ' : '') + line.trim()
      }
    }
  }

  return { meta, body: match[2] }
}

// ---------------------------------------------------------------------------
// Typst escape — escape characters that have special meaning in Typst markup
// ---------------------------------------------------------------------------

function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/</g, '\\<')
    .replace(/@/g, '\\@')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

// ---------------------------------------------------------------------------
// MDAST → Typst markup
// ---------------------------------------------------------------------------

interface Ctx {
  footnoteDefs: Map<string, any[]>
  prevBlockType: string
  inBlockquote: boolean
}

/** First pass: collect footnote definitions from the AST */
function collectFootnoteDefs(node: any): Map<string, any[]> {
  const defs = new Map<string, any[]>()
  if (node.type === 'footnoteDefinition') {
    defs.set(node.identifier, node.children)
  }
  if (node.children) {
    for (const child of node.children) {
      for (const [k, v] of collectFootnoteDefs(child)) {
        defs.set(k, v)
      }
    }
  }
  return defs
}

function blocks(node: any, ctx: Ctx): string {
  switch (node.type) {
    case 'root':
      return node.children.map((c: any) => blocks(c, ctx)).join('\n')

    case 'paragraph': {
      const shouldIndent =
        ctx.prevBlockType === 'paragraph' ||
        ctx.prevBlockType === 'blockquote' ||
        ctx.prevBlockType === 'list'
      ctx.prevBlockType = 'paragraph'

      // Check if Fråga: and Svar: are combined in one paragraph —
      // split into two separate paragraphs at the Svar: boundary
      if (node.children) {
        const svarIdx = node.children.findIndex((c: any, i: number) =>
          i > 0 && c.type === 'strong' && c.children?.[0]?.value?.startsWith('Svar:')
        )
        if (svarIdx > 0) {
          // Render the Fråga part
          const fragaPara = { ...node, children: node.children.slice(0, svarIdx) }
          const svarPara = { ...node, children: node.children.slice(svarIdx) }
          return blocks(fragaPara, ctx) + blocks(svarPara, ctx)
        }
      }

      const text = inlines(node, ctx)

      // Detect Fråga:/Svar: labels (bold or plain, with possible whitespace)
      const isQA = /^\s*\*?(Fråga|Svar):/.test(text)

      if (isQA) {
        return `#v(8pt)\n#block[#set par(first-line-indent: 0pt)\n${text}]\n`
      }

      // Suppress first-line indent on first paragraph after heading/break
      if (!shouldIndent && !ctx.inBlockquote) {
        return `#block[#set par(first-line-indent: 0pt)\n${text}]\n`
      }

      return `${text}\n`
    }

    case 'heading': {
      ctx.prevBlockType = 'heading'
      // Article-internal headings: offset by 2 (h2→===, h3→====)
      const level = Math.min(node.depth + 2, 6)
      const marker = '='.repeat(level)
      return `${marker} ${inlines(node, ctx)}\n`
    }

    case 'blockquote': {
      const prevBlockType = ctx.prevBlockType
      ctx.prevBlockType = 'blockquote'
      const prevInBlockquote = ctx.inBlockquote
      ctx.inBlockquote = true
      const inner = node.children.map((c: any) => blocks(c, ctx)).join('\n')
      ctx.inBlockquote = prevInBlockquote
      // Less space when consecutive blockquotes (e.g. multiple Koranic verses)
      const space = prevBlockType === 'blockquote' ? 6 : 20
      return `#block(inset: (left: 20pt), above: ${space}pt, below: ${space}pt)[#set par(justify: false)\n#text(size: 9.5pt, fill: rgb("#333"))[\n${inner}]]\n`
    }

    case 'list': {
      ctx.prevBlockType = 'list'
      const items = node.children.map((li: any) => {
        const liContent = li.children.map((c: any) => {
          if (c.type === 'paragraph') return inlines(c, ctx)
          return blocks(c, ctx)
        }).join('\n')
        const marker = node.ordered ? '+' : '-'
        return `${marker} ${liContent}`
      })
      return `#pad(left: 10pt)[\n${items.join('\n')}\n]\n`
    }

    case 'thematicBreak':
      ctx.prevBlockType = 'thematicBreak'
      return '#ornament()\n'

    case 'footnoteDefinition':
      // Handled by collectFootnoteDefs — skip here
      return ''

    case 'html':
      return ''

    default:
      return ''
  }
}

function inlines(node: any, ctx: Ctx): string {
  if (!node.children) return esc(node.value || '')
  return node.children.map((c: any) => inline(c, ctx)).join('')
}

function inlinesFromChildren(children: any[], ctx: Ctx): string {
  return children.map((child: any) => {
    if (child.type === 'paragraph') return inlines(child, ctx)
    if (child.children) return inlinesFromChildren(child.children, ctx)
    return esc(child.value || '')
  }).join('')
}

function inline(node: any, ctx: Ctx): string {
  switch (node.type) {
    case 'text':
      return esc(node.value)
    case 'emphasis':
      return `#emph[${inlines(node, ctx)}]`
    case 'strong':
      return `*${inlines(node, ctx)}*`
    case 'link':
      return inlines(node, ctx)
    case 'inlineCode':
      return `\`${node.value}\``
    case 'footnoteReference': {
      const def = ctx.footnoteDefs.get(node.identifier)
      if (def) {
        const content = inlinesFromChildren(def, ctx)
        return `#footnote[${content}]`
      }
      return ''
    }
    case 'break':
      return '\\\n'
    case 'html':
      return esc(node.value.replace(/<[^>]+>/g, ''))
    case 'delete':
      return inlines(node, ctx)
    default:
      if (node.children) return inlines(node, ctx)
      return esc(node.value || '')
  }
}

// ---------------------------------------------------------------------------
// Content loading (unchanged from pdfmake version)
// ---------------------------------------------------------------------------

interface Article {
  title: string
  author: string
  categories: string[]
  categorySlug: string
  subcategorySlug: string
  ast: any
}

interface Subcategory {
  slug: string
  name: string
  arabicTerm?: string
  articles: Article[]
}

interface Category {
  slug: string
  name: string
  subcategories: Subcategory[]
}

function cleanCategoryName(name: string): string {
  return name
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
}

function deriveSubcategoryName(articles: Article[], fallbackSlug: string): string {
  for (const article of articles) {
    if (article.categories.length >= 2) {
      return cleanCategoryName(article.categories[1])
    }
  }
  return fallbackSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function loadContent(): Category[] {
  const categories: Category[] = []

  for (const catSlug of CATEGORY_ORDER) {
    const catDir = join(CONTENT_DIR, catSlug)
    if (!existsSync(catDir)) continue

    const category: Category = {
      slug: catSlug,
      name: CATEGORY_NAMES[catSlug] || catSlug,
      subcategories: [],
    }

    const entries = readdirSync(catDir)
    const directArticles: Article[] = []
    const subDirs: string[] = []

    for (const entry of entries) {
      if (entry === '_index.md' || entry === 'KORREKTURLASNING.md') continue
      const fullPath = join(catDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        subDirs.push(entry)
      } else if (entry.endsWith('.md')) {
        const raw = readFileSync(fullPath, 'utf-8')
        const { meta, body } = parseFrontmatter(raw)
        if (!meta.title) continue
        const tree = processor.parse(body)
        directArticles.push({
          title: meta.title,
          author: meta.author,
          categories: meta.categories,
          categorySlug: catSlug,
          subcategorySlug: '',
          ast: processor.runSync(tree),
        })
      }
    }

    if (directArticles.length > 0) {
      category.subcategories.push({
        slug: 'allmant',
        name: 'Allmänt',
        articles: directArticles.sort((a, b) => a.title.localeCompare(b.title, 'sv')),
      })
    }

    subDirs.sort((a, b) => {
      const aIsMisc = a === 'blandade-utlatanden'
      const bIsMisc = b === 'blandade-utlatanden'
      if (aIsMisc && !bIsMisc) return 1
      if (!aIsMisc && bIsMisc) return -1
      return a.localeCompare(b, 'sv')
    })
    for (const subSlug of subDirs) {
      const subDir = join(catDir, subSlug)
      const files = readdirSync(subDir).filter(
        (f) => f.endsWith('.md') && f !== '_index.md',
      )

      const articles: Article[] = []
      for (const file of files) {
        const raw = readFileSync(join(subDir, file), 'utf-8')
        const { meta, body } = parseFrontmatter(raw)
        if (!meta.title) continue
        const tree = processor.parse(body)
        articles.push({
          title: meta.title,
          author: meta.author,
          categories: meta.categories,
          categorySlug: catSlug,
          subcategorySlug: subSlug,
          ast: processor.runSync(tree),
        })
      }

      if (articles.length === 0) continue

      articles.sort((a, b) => a.title.localeCompare(b.title, 'sv'))

      const displayName = deriveSubcategoryName(articles, subSlug)
      category.subcategories.push({
        slug: subSlug,
        name: displayName,
        arabicTerm: ARABIC_TERMS[displayName],
        articles,
      })
    }

    if (category.subcategories.length > 0) {
      categories.push(category)
    }
  }

  return categories
}

// ---------------------------------------------------------------------------
// Article builder
// ---------------------------------------------------------------------------

function buildArticle(article: Article): string {
  const footnoteDefs = collectFootnoteDefs(article.ast)
  const ctx: Ctx = { footnoteDefs, prevBlockType: '', inBlockquote: false }
  const body = blocks(article.ast, ctx)

  const lines: string[] = []

  // Title + author kept together
  lines.push('#block(breakable: false)[')
  lines.push('  #set par(first-line-indent: 0pt)')
  lines.push(`  #text(font: "Noto Serif", size: 12pt, weight: "bold")[${esc(article.title)}]`)
  if (article.author) {
    lines.push('  #v(2pt)')
    lines.push(`  #text(font: "Noto Serif", size: 8.5pt, style: "italic", fill: rgb("#888"))[${esc(article.author)}]`)
  }
  lines.push('  #v(10pt)')
  lines.push(']')

  lines.push(body)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildCategorySection(category: Category): string {
  const lines: string[] = []

  // Category title page — recto
  lines.push('#pagebreak(to: "odd")')
  lines.push('#v(100pt)')
  lines.push(`= ${esc(category.name)}`)
  lines.push('#line(length: 70pt, stroke: 0.5pt + rgb("#999"))')

  for (const sub of category.subcategories) {
    if (sub.slug) {
      const label = sub.arabicTerm ? `${sub.name} (${sub.arabicTerm})` : sub.name
      lines.push('#v(28pt)')
      lines.push(`== ${esc(label)}`)
      lines.push('#line(length: 40pt, stroke: 0.3pt + rgb("#ccc"))')
      lines.push('#v(14pt)')
    }

    for (let i = 0; i < sub.articles.length; i++) {
      if (i > 0) {
        lines.push('#article-sep()')
      }
      lines.push(buildArticle(sub.articles[i]))
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Front matter
// ---------------------------------------------------------------------------

function buildFrontMatter(articleCount: number): string {
  const year = new Date().getFullYear()
  const fullDate = new Date().toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `// Front matter — no headers, footers, or page numbers
#set page(header: none, footer: none)

// i. Half-title (recto)
#v(240pt)
#align(center)[#text(font: "Noto Serif", size: 16pt, style: "italic", fill: rgb("#333"))[Samlade utlåtanden]]

// ii. Blank verso
#pagebreak()

// iii. Title page (recto)
#pagebreak()
#v(170pt)
#align(center)[
  #text(font: "Noto Sans", size: 10pt, fill: rgb("#888"), tracking: 4pt)[AL-IBADAH]
  #v(24pt)
  #text(font: "Noto Serif", size: 26pt)[Samlade utlåtanden]
  #v(10pt)
  #text(font: "Noto Serif", size: 10pt, style: "italic", fill: rgb("#888"))[
    Frågor och svar om islamisk rättslära\\
    från erkända lärda
  ]
  #v(32pt)
  #ornament()
  #v(150pt)
  #text(font: "Noto Serif", size: 10pt, fill: rgb("#888"))[${year}]
]

// iv. Colophon (verso)
#pagebreak()
#set par(first-line-indent: 0pt)
#v(1fr)
#text(font: "Noto Serif", size: 7.5pt, fill: rgb("#999"))[
  *al-Ibadah* \\
  Denna samling genererades den ${fullDate} \\
  och innehåller ${articleCount.toLocaleString('sv-SE')} utlåtanden.
  #v(6pt)
  Texterna publiceras löpande på al-ibadah.com \\
  och uppdateras i denna volym vid varje utgåva.
]

// v–vi. Foreword
#pagebreak()
#set par(first-line-indent: 0pt)
#v(70pt)
#text(font: "Noto Serif", size: 17pt, style: "italic")[Om denna samling]
#line(length: 50pt, stroke: 0.4pt + rgb("#ccc"))
#v(24pt)

al-Ibadah samlar religiösa utlåtanden för svensktalande muslimer som vill praktisera sin tro i enlighet med Koranen och profetens #emph[sunnah] – fred och välsignelser vare över honom – så som den förståtts av islams första generationer och förklarats av erkända lärda.

Mycket av dagens religiösa innehåll har blivit kortare och snabbare. Texterna här går i en annan riktning: utlåtandena återges med de lärdas bevisföring och resonemang, inte som förkortade slutsatser. Den som läser ska kunna följa hur ett svar har nåtts, inte bara vad svaret blev.

Kunskap i islam har sedan dess början förmedlats genom text och muntlig överföring, med sammanhang och tålamod. Det är den traditionen denna samling försöker förvalta.

#v(8pt)
#text(font: "Noto Sans", size: 11pt, weight: "bold", fill: rgb("#333"))[Källor]
#v(4pt)

Utlåtandena är översatta från #emph[Fatāwā Islāmiyyah] och #emph[Fatāwā Arkān ul-Islām], samlingar av utlåtanden från erkända sunnitiska lärda: Ibn Bāz, Ibn Uthaymīn, al-Albānī och al-Jibrīn – #emph[rahimahum Allāh].

#v(8pt)
#text(font: "Noto Sans", size: 11pt, weight: "bold", fill: rgb("#333"))[Att vara muslim i Sverige]
#v(4pt)

Utlåtandena är i huvudsak allmängiltiga, men vissa texter berör frågor som kan kräva lokal hänsyn. Läsaren uppmanas att sätta sig in i principerna bakom utlåtandena och vid behov rådgöra med kunniga i sin närhet.

#v(8pt)
#text(font: "Noto Sans", size: 11pt, weight: "bold", fill: rgb("#333"))[Upphovsrätt]
#v(4pt)

Översättningarna är utgivna under CC-BY-4.0 och får spridas fritt med källhänvisning.

#v(12pt)
#text(style: "italic", fill: rgb("#555"))[Må Allah godta detta arbete och göra det till nytta. Fred och välsignelser över profeten Muhammad, hans familj och hans följeslagare.]
`
}

// ---------------------------------------------------------------------------
// TOC
// ---------------------------------------------------------------------------

function buildTOCPage(): string {
  return `
#pagebreak()
#v(70pt)
#text(font: "Noto Serif", size: 17pt, style: "italic")[Innehåll]
#line(length: 50pt, stroke: 0.4pt + rgb("#ccc"))
#v(24pt)
#outline(title: none, indent: 10pt, depth: 2)
`
}

// ---------------------------------------------------------------------------
// Glossary appendix
// ---------------------------------------------------------------------------

const GLOSSARY_CATEGORY_ORDER = [
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
  'swedishTerms',
]

const GLOSSARY_CATEGORY_NAMES: Record<string, string> = {
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
  tawhidTerms: 'Tawhid-former',
  phrases: 'Fraser',
  miswakAndOther: 'Övrigt',
  swedishTerms: 'Svenska ord',
}

interface GlossaryEntry {
  canonical: string
  definition: string
  category: string
}

function loadGlossary(): GlossaryEntry[] {
  const jsonPath = join(ROOT, 'src/data/italicized-terms.json')
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  const entries: GlossaryEntry[] = []

  for (const [category, data] of Object.entries(raw.categories) as any[]) {
    for (const term of data.terms) {
      if (term.definition) {
        entries.push({
          canonical: term.canonical,
          definition: term.definition,
          category,
        })
      }
    }
  }

  return entries
}

function buildGlossary(): string {
  const entries = loadGlossary()
  const grouped = new Map<string, GlossaryEntry[]>()

  for (const entry of entries) {
    if (!grouped.has(entry.category)) grouped.set(entry.category, [])
    grouped.get(entry.category)!.push(entry)
  }

  for (const terms of grouped.values()) {
    terms.sort((a, b) => a.canonical.localeCompare(b.canonical, 'sv'))
  }

  const lines: string[] = []
  lines.push('#pagebreak(to: "odd")')
  lines.push('#v(70pt)')
  lines.push('= Ordlista')
  lines.push('#line(length: 50pt, stroke: 0.4pt + rgb("#ccc"))')
  lines.push('#v(20pt)')

  let termCount = 0

  for (const categoryKey of GLOSSARY_CATEGORY_ORDER) {
    const terms = grouped.get(categoryKey)
    if (!terms || terms.length === 0) continue

    termCount += terms.length
    const categoryName = GLOSSARY_CATEGORY_NAMES[categoryKey] || categoryKey

    lines.push(`#text(font: "Noto Sans", size: 11pt, weight: "bold", fill: rgb("#333"))[${esc(categoryName)}]`)
    lines.push('#v(8pt)')
    lines.push('#table(')
    lines.push('  stroke: none,')
    lines.push('  columns: (auto, 1fr),')
    lines.push('  inset: (x: 4pt, y: 2pt),')

    for (const term of terms) {
      lines.push(`  text(size: 9.5pt, style: "italic")[${esc(term.canonical)}],`)
      lines.push(`  text(size: 9pt, fill: rgb("#444"))[${esc(term.definition)}],`)
    }

    lines.push(')')
    lines.push('#v(4pt)')
  }

  console.log(`  Ordlista: ${termCount} termer`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Typst preamble — all #set/#show rules
// ---------------------------------------------------------------------------

function buildPreamble(): string {
  return `// Samlade utlåtanden — al-Ibadah
// Generated by scripts/generate-pdf.ts

// --- Document metadata ---
#set document(
  title: "Samlade utlåtanden — al-Ibadah",
  author: "al-Ibadah",
)

// --- Disable smart quotes (remark-smartypants already handles them) ---
#set smartquote(enabled: false)

// --- Fonts and base text ---
#set text(
  font: "Noto Serif",
  size: 10.5pt,
  fill: rgb("#1a1a1a"),
  lang: "sv",
  region: "SE",
  hyphenate: true,
)

// --- Paragraph: Swedish book style ---
#set par(
  first-line-indent: (amount: 16pt, all: true),
  leading: 0.65em * 1.35,
  justify: true,
  linebreaks: "optimized",
)

// --- Page layout: asymmetric margins ---
#set page(
  paper: "a4",
  margin: (
    top: 72pt,
    bottom: 85pt,
    inside: 75pt,
    outside: 90pt,
  ),
)

// --- Footnotes ---
#set footnote.entry(
  separator: line(length: 70pt, stroke: 0.3pt + rgb("#ccc")),
  clearance: 10pt,
  gap: 3pt,
  indent: 0pt,
)
#show footnote.entry: set text(size: 7.5pt, fill: rgb("#555"))

// --- Heading styles ---
// Level 1: Category titles
#show heading.where(level: 1): it => {
  set text(font: "Noto Serif", size: 20pt, fill: rgb("#1a1a1a"))
  block(above: 0pt, below: 14pt, it.body)
}

// Level 2: Subcategory titles
#show heading.where(level: 2): it => {
  set text(font: "Noto Sans", size: 13pt, weight: "bold", fill: rgb("#333"))
  block(above: 0pt, below: 8pt, sticky: true, it.body)
}

// Level 3: Article subheadings (h2 in markdown)
#show heading.where(level: 3): it => {
  set text(font: "Noto Sans", size: 11pt, weight: "bold", fill: rgb("#333"))
  block(above: 18pt, below: 7pt, sticky: true, it.body)
}

// Level 4: Article sub-subheadings (h3 in markdown)
#show heading.where(level: 4): it => {
  set text(font: "Noto Sans", size: 10pt, weight: "bold", fill: rgb("#333"))
  block(above: 18pt, below: 7pt, sticky: true, it.body)
}

// Levels 3-4 excluded from TOC and bookmarks
#show heading.where(level: 3): set heading(outlined: false, bookmarked: false)
#show heading.where(level: 4): set heading(outlined: false, bookmarked: false)

// --- Helper functions ---
#let ornament() = align(center, block(above: 14pt, below: 14pt,
  image("ornament.svg", width: 100pt)
))

#let article-sep() = align(center, block(above: 18pt, below: 18pt,
  line(length: 105pt, stroke: 0.4pt + rgb("#ccc"))
))
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Läser innehåll...')

  const categories = loadContent()
  let totalArticles = 0
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      totalArticles += sub.articles.length
    }
  }

  console.log(
    `${categories.length} kategorier, ${totalArticles.toLocaleString('sv-SE')} utlåtanden`,
  )

  const parts: string[] = []

  // Preamble
  parts.push(buildPreamble())

  // Front matter (suppresses headers/footers)
  parts.push(buildFrontMatter(totalArticles))

  // TOC
  parts.push(buildTOCPage())

  // Body: enable running headers and page numbers
  parts.push(`
// --- Body: enable headers, footers, page numbering ---
#set page(
  header: context {
    let pg = counter(page).get().first()
    if pg <= 1 { return }
    let is-even = calc.even(here().page())
    set text(font: "Noto Serif", size: 7.5pt, style: "italic", fill: rgb("#bbb"))
    if is-even {
      align(left)[Samlade utlåtanden]
    } else {
      align(right)[al-Ibadah]
    }
  },
  footer: context {
    let pg = counter(page).get().first()
    if pg <= 1 { return }
    let is-even = calc.even(here().page())
    set text(font: "Noto Serif", size: 7.5pt, fill: rgb("#bbb"))
    if is-even {
      align(left)[#counter(page).display()]
    } else {
      align(right)[#counter(page).display()]
    }
  },
)
#counter(page).update(1)
#set par(first-line-indent: (amount: 16pt, all: true))
`)

  // Categories
  for (const category of categories) {
    console.log(`  ${category.name}...`)
    parts.push(buildCategorySection(category))
  }

  // Glossary appendix
  parts.push(buildGlossary())

  // Write .typ file and ornament SVG
  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true })
  writeFileSync(join(DIST, 'ornament.svg'), ORNAMENT_SVG)
  writeFileSync(TYPST_PATH, parts.join('\n\n'))

  // Compile with Typst
  console.log('Kompilerar med Typst...')
  execSync(`${TYPST_BIN} compile --font-path "${FONT_DIR}" "${TYPST_PATH}" "${OUTPUT}"`, {
    stdio: 'inherit',
  })

  const sizeKB = Math.round(statSync(OUTPUT).size / 1024)
  console.log(`\u2713 ${OUTPUT} (${sizeKB.toLocaleString('sv-SE')} KB)`)
}

main().catch((err) => {
  console.error('PDF-generering misslyckades:', err)
  process.exit(1)
})
