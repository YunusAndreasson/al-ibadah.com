# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a reading-focused site. The content — Islamic scholarly texts in Swedish — is the product. Every decision should serve **readability**, **clean aesthetics**, and **fast performance**. Typography, whitespace, and navigation exist to make long-form religious text easy and pleasant to read. Prefer simplicity over cleverness; remove friction rather than adding features.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Validate content + build (runs validate scripts first)
pnpm typecheck        # Astro check + tsc --noEmit
pnpm lint             # Biome check
pnpm lint:fix         # Biome check --write
pnpm extract:glossary # Regenerate src/data/glossary.ts from content + italicized-terms.json
pnpm validate         # Validate frontmatter and markdown structure
pnpm validate:terms   # Validate Arabic transliteration consistency
pnpm knip             # Unused files, exports and dependencies
pnpm verify           # lint + knip + typecheck + build (full check — run before finishing; CI runs it)
pnpm pdf              # dist/samlingsvolym.pdf via Typst (needs `typst`)
pnpm og:image         # public/og-image.png from scripts/og-image.html (needs Chrome/Chromium)
pnpm deploy           # Build + PDFs + wrangler pages deploy (see Deploy)
```

There are no tests. Validation is done via `pnpm validate` and `pnpm validate:terms` (both run automatically during `pnpm build`).

## Deploy

`pnpm deploy` builds the site, generates PDFs (`pnpm pdf`), then uploads `dist/`
with `wrangler pages deploy dist --project-name al-ibadah --branch main`.
Cloudflare Pages, direct upload — CI only verifies (`.github/workflows/verify.yml`), it never deploys.
Requires wrangler auth (`wrangler login`). Deploy with `pnpm deploy`, not a bare `wrangler pages deploy`:
skipping `pnpm pdf` ships without `samlingsvolym.pdf` and breaks the footer's download link.

## Architecture

**Astro 7 static site** (SSG) with Preact islands (raw Preact, not React/compat), deployed to Cloudflare Pages. Content is ~1,650 markdown articles about Islamic jurisprudence in Swedish.

### Content Pipeline

Articles live in `content/{category}/{subcategory?}/article.md` across 8 categories. The content collection is defined in `src/content.config.ts` with a glob loader that excludes `_index.md` files.

**Markdown processing chain** (`markdown.processor: unified({...})` in `astro.config.mjs`; Astro 7 defaults to Sätteri, so the unified processor from `@astrojs/markdown-remark` is what keeps these remark/rehype plugins running):
1. `remark-gfm` → `remark-smartypants` → `remark-glossary-terms` (custom) → rehype
2. `rehype-raw` → `rehype-slug` → `rehype-qa-labels` (custom)

The two custom plugins:
- **remark-glossary-terms** — Matches italicized Arabic terms and Swedish terms against the glossary, wrapping them with tooltip `data-definition` attributes
- **rehype-qa-labels** — Adds `.qa-label` class to `**Fråga:**` / `**Svar:**` paragraphs

### Glossary System

Three-tier data flow:
1. `src/data/italicized-terms.json` — Canonical source of truth for all terms with transliterations and definitions
2. `scripts/extract-glossary-definitions.ts` — Merges JSON with footnote definitions extracted from content
3. `src/data/glossary.ts` — **Auto-generated** (do not edit manually), consumed by the remark plugin

After modifying `italicized-terms.json` or content footnotes, run `pnpm extract:glossary` to regenerate.

### Homepage Content Selection

The homepage shows occasion-driven article sections:
- `src/lib/hijri/` — Gregorian↔Hijri conversion, `detectOccasions()` for Islamic calendar events (Ramadan, Hajj, Eid, etc.)
- `src/lib/content-selection/selector.ts` — `getStartpageSections()` picks articles based on active occasions, with daily rotation seeding for variety
- Everything runs at build time in `index.astro` (occasions, sections, "om ~N dagar"), so the homepage only changes when the site is rebuilt

### Preact Islands

Six islands:
- `ui/ThemeToggle`, `ui/SearchIsland` (lazy-loads `SearchDialog`), `ui/MobileMenu` — `client:idle` in Header
- `ui/ShareButton`, `ui/CopyButton` — `client:idle` in ArticleRenderer
- `startpage/AskSearch` — `client:load` on the index page

### Search

- **Ctrl+K** (`SearchDialog`) fetches `/search-index.json` (`src/pages/search-index.json.ts`) on first open and matches titles, then subcategory Arabic terms, through `normalizeArabic` (so "tarawih" finds "tarāwīḥ"; å ä ö stay distinct). `findNormalized` maps matches back for the highlight.
- **AI search** (`AskSearch`, and the AI section of `SearchDialog`) calls `/api/search`, a Pages Function (`functions/api/search.ts`) that queries Cloudflare AI Search `al-ibadah-search` retrieval-only — never generated text.

### Pages Functions

`functions/` runs on Cloudflare Pages, not under `astro dev` (use `pnpm build && pnpm exec wrangler pages dev dist`):
- `_middleware.ts` — 301s legacy `/index.php?article=<id>` URLs via `src/data/legacy-redirects.ts` (generated by `pnpm generate:redirects` from each article's `original_id`, first step of `pnpm build`) and `www.` → apex
- `api/search.ts` — the AI search endpoint above

### Agent access

The site is built to be read by AI agents (ChatGPT, Claude, Perplexity) as well as people:
- **Markdown twins** — `src/pages/[...path].md.ts` emits `<path>.md` for every category, subcategory and article (`/fasta.md`, `/fasta/nattbon.md`, `/fasta/nattbon/<slug>.md`): the raw article body under a metadata header. Rendering lives in `src/lib/agent-markdown.ts`; pages advertise their twin with `<link rel="alternate" type="text/markdown">` (`markdownPath` prop on BaseLayout).
- **`/llms.txt`** (`src/pages/llms.txt.ts`) — llmstxt.org map: categories → subcategory `.md` indexes.
- **Content negotiation** — `functions/_middleware.ts` serves the twin for `Accept: text/markdown` (Accept header only, never User-Agent), adds `Vary: Accept`, and gives `.md` files a canonical `Link` header back to the HTML page.
- **robots.txt** — every crawler allowed, with `Content-Signal: search=yes, ai-input=yes, ai-train=yes` (matches CC BY 4.0). JSON-LD carries `license` and git-based `dateModified` (`src/lib/git-lastmod.ts`, which also feeds the sitemap's lastmod).

### Routing

File-based pages in `src/pages/`:
- `[category]/index.astro` — Subcategory listing
- `[category]/[subcategory]/index.astro` — Article listing
- `[category]/[slug].astro` and `[category]/[subcategory]/[slug].astro` — Article pages

### Styling

Tailwind CSS 4 via Vite plugin. Design tokens (colors, fonts) defined in `src/styles/app.css` using CSS custom properties with oklch colors. Light/dark mode via `.dark` class toggled by inline script in BaseLayout.

## Conventions

- **Path alias**: `~/` maps to `src/` (configured in both `tsconfig.json` and `astro.config.mjs`)
- **Formatting**: Biome with single quotes, no semicolons, 2-space indent, 100 char line width
- **Arabic transliteration**: Uses a specific scholarly convention — see `src/data/italicized-terms.json` for canonical spellings. Key: ḥ(ح) ṣ(ص) ṭ(ط) ḍ(ض) ẓ(ظ) k̲h(خ) s̲h(ش) t̲h(ث) d̲h(ذ) g̲h(غ) with macrons (ā ī ū) and ´(ع) '(ء)
- **Language**: UI text and content are in Swedish. Code comments and variable names are in English. Repo docs (README, CONTRIBUTING, SECURITY) are in English; issue templates are in Swedish for readers.
- **Licenses**: code MIT (`LICENSE`), translations CC BY 4.0 (`content/LICENSE`, also stated on `/om`).

## Dependency constraints

- **TypeScript stays on 6.x.** `astro check` (in `pnpm typecheck`) needs TypeScript's JS API, which the native TS 7 compiler doesn't ship; Dependabot ignores the major.
- **`pnpm-workspace.yaml` `packageExtensions`** gives `@astrojs/astro2tsx` the `@emnapi/runtime` matching its pinned `@emnapi/core`. Without it pnpm picks a 2.0 beta runtime and `astro check` fails as "@astrojs/check not installed".
- **`compressHTML`** is left at Astro 7's `'jsx'` default: it renders the same text as Astro 6 did. `true` adds visible spaces (e.g. before `.arabic-inline` subtitles).
