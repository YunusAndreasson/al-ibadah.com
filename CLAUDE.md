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
```

There are no tests. Validation is done via `pnpm validate` and `pnpm validate:terms` (both run automatically during `pnpm build`).

## Architecture

**Astro 5 static site** (SSG) with React islands, deployed to Cloudflare Pages. Content is 1,670+ markdown articles about Islamic jurisprudence in Swedish.

### Content Pipeline

Articles live in `content/{category}/{subcategory?}/article.md` across 8 categories. The content collection is defined in `src/content.config.ts` with a glob loader that excludes `_index.md` files.

**Markdown processing chain** (configured in `astro.config.mjs`):
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
- Article data is built at SSG time in `index.astro`, passed as `CompactArticle[]` to `HomepageIsland`, occasion detection runs client-side

### React Islands

Five React islands, all in `src/components/`:
- `ThemeToggle`, `SearchIsland`, `MobileMenu` — `client:load` in Header
- `ShareButton` — `client:idle` in ArticleRenderer
- `HomepageIsland` — `client:load` on index page only

Search index is built in `BaseLayout.astro` frontmatter and injected via `window.__SEARCH_INDEX__`.

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
- **Language**: UI text and content are in Swedish. Code comments and variable names are in English.
