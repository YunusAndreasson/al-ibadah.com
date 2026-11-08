# Contributing

The most useful contribution is a correction: a typo, a mistranslation, a
transliteration that doesn't follow the convention, a broken reference. Bug
reports and pull requests for the site are welcome too. For anything bigger
than a fix, open an issue first so we can agree on the shape before you write
the code.

Issues and pull requests can be in Swedish or English.

## Correcting a text

Each article is one Markdown file under `content/`, at the same path as its
URL: `al-ibadah.com/fasta/nattbon/nattbonen-sker-i-omgangar-om-tva-bonecykler/`
is `content/fasta/nattbon/nattbonen-sker-i-omgangar-om-tva-bonecykler.md`.

- Open a [correction issue](https://github.com/YunusAndreasson/al-ibadah.com/issues/new?template=rattelse.yml)
  with the link, what the text says and what it should say, or
- edit the file on GitHub and open a pull request.

Arabic terms follow one transliteration, with the canonical spelling of each
term in [`src/data/italicized-terms.json`](src/data/italicized-terms.json):
ḥ (ح), ṣ (ص), ṭ (ط), ḍ (ض), ẓ (ظ), k̲h (خ), s̲h (ش), t̲h (ث), d̲h (ذ), g̲h (غ),
long vowels ā ī ū, ´ for ع and ' for ء. Terms are italicised (`*sunnah*`),
which is what gives them a definition on hover. `pnpm validate:terms` flags a
spelling that doesn't match.

## Build and check

You need Node 22.23 or newer and pnpm 11 (the exact version is pinned in
`package.json` under `packageManager`).

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm verify    # lint, unused code, type check, content validation and the build
```

Before a pull request:

- `pnpm verify` passes. CI runs the same command.
- For a change to `src/data/italicized-terms.json` or to footnotes, run
  `pnpm extract:glossary` and commit the regenerated `src/data/glossary.ts`.
- One change per pull request. Commit subjects follow the repository's style:
  short, in Swedish, optionally prefixed with the area (`SEO: …`,
  `Footer: …`).

The Pages Functions in `functions/` don't run under `pnpm dev`; test them with
`pnpm build && pnpm exec wrangler pages dev dist`.

## What al-Ibadah won't do

- **Publish new rulings.** The texts are translations of established
  scholars, each with its source. As the [about page](https://al-ibadah.com/om/)
  says, religious questions belong with local scholars or recognised sources
  of knowledge, not in an issue.
- **Generate answers.** The AI search returns the scholar's own text and links
  to it. It never writes prose of its own.
- **Track readers.** No analytics and no cookies; the theme choice is kept in
  `localStorage`.

## Security issues

Not in issues or pull requests: see [SECURITY.md](SECURITY.md).

## Conduct and license

Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md). By
contributing code you agree it is released under the [MIT license](LICENSE),
and by contributing to the texts in `content/` that it is released under
[CC BY 4.0](content/LICENSE).
