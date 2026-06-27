/**
 * Author/source authority registry (E-E-A-T).
 *
 * Almost every article is a Swedish translation of a fatwa or text by a small set
 * of real, notable scholars. This registry connects each article's plain-text
 * byline to a verifiable entity — the on-site biography page plus the scholar's
 * Wikidata + Wikipedia records — so search engines (and AI search) can recognise
 * the genuine scholarly authorship behind the content.
 *
 * Consumed by `src/lib/structured-data.ts` (schema.org author / Person nodes) and
 * `src/components/content/ArticleRenderer.astro` (byline → biography link).
 *
 * The `sameAs` URLs were verified against the Wikidata API (entity ids shown).
 */

export interface AuthorEntity {
  /** schema.org type — most are people; the Permanent Committee is a body. */
  type: 'Person' | 'Organization'
  /** Canonical display name (scholarly transliteration). */
  name: string
  /** Biography page slug under /biografier/, when one exists on the site. */
  bioSlug?: string
  /** Title held, for Person entities. */
  jobTitle?: string
  /** Byline strings as they appear in content frontmatter (incl. spelling variants). */
  names: string[]
  /** Verified authoritative records (Wikidata id in a comment beside each set). */
  sameAs: string[]
}

const ENTITIES: AuthorEntity[] = [
  {
    type: 'Person',
    name: 'Muḥammad bin Sālih al-´Uthaymīn',
    bioSlug: 'shaykh-muhammad-ibn-salih-ibn-uthaymin',
    jobTitle: 'Islamisk lärd',
    names: ['Muḥammad bin Sālih al-´Uthaymīn'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q1398150',
      'https://en.wikipedia.org/wiki/Al-Uthaymin',
      'https://ar.wikipedia.org/wiki/%D9%85%D8%AD%D9%85%D8%AF_%D8%A8%D9%86_%D8%B5%D8%A7%D9%84%D8%AD_%D8%A7%D9%84%D8%B9%D8%AB%D9%8A%D9%85%D9%8A%D9%86',
    ],
  },
  {
    type: 'Person',
    name: '´Abdul-´Azīz Ibn Bāz',
    bioSlug: 'shaykh-abdul-aziz-ibn-abdullah-ibn-abdur-rahman-ib',
    jobTitle: 'Islamisk lärd',
    names: ['Ibn ´Abdullāh Ibn Bāz', 'Ibn ´Abdullah Ibn Bāz'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q307193',
      'https://en.wikipedia.org/wiki/Ibn_Baz',
      'https://ar.wikipedia.org/wiki/%D8%A7%D8%A8%D9%86_%D8%A8%D8%A7%D8%B2',
    ],
  },
  {
    type: 'Organization',
    name: "al-Ladjnah ad-Dā'imah (Den permanenta kommittén för forskning och fatwa)",
    names: [
      "al-Ladjnah ad-Dā'imah (Den Permanenta Fatwa-kommittén)",
      'al-Ladjnah ad-Dā’imah (Den Permanenta Fatwa-kommittén)',
    ],
    sameAs: [
      'https://www.wikidata.org/wiki/Q2360234',
      'https://en.wikipedia.org/wiki/Permanent_Committee_for_Scholarly_Research_and_Ifta',
      'https://ar.wikipedia.org/wiki/%D8%A7%D9%84%D8%B1%D8%A6%D8%A7%D8%B3%D8%A9_%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9_%D9%84%D9%84%D8%A8%D8%AD%D9%88%D8%AB_%D8%A7%D9%84%D8%B9%D9%84%D9%85%D9%8A%D8%A9_%D9%88%D8%A7%D9%84%D8%A5%D9%81%D8%AA%D8%A7%D8%A1',
    ],
  },
  {
    type: 'Person',
    name: '´Abdullāh Ibn ´Abdur-Rahman al-Jibrīn',
    bioSlug: 'ibn-abdur-rahman-al-jibrin',
    jobTitle: 'Islamisk lärd',
    names: ['Ibn ´Abdur-Rahman al-Jibrīn', 'Ibn ´Abdur-Rahman al-Jibrin'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q317657',
      'https://en.wikipedia.org/wiki/Ibn_Jibrin',
      'https://ar.wikipedia.org/wiki/%D8%A7%D8%A8%D9%86_%D8%AC%D8%A8%D8%B1%D9%8A%D9%86',
    ],
  },
  {
    type: 'Person',
    name: 'Sālih al-Fawzān',
    jobTitle: 'Islamisk lärd',
    names: ['Dr. Sālih Ibn Fowzan Ibn ´Abdullah Ibn Fowzan'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q61589',
      'https://en.wikipedia.org/wiki/Salih_al%E2%80%91Fawzan',
      'https://ar.wikipedia.org/wiki/%D8%B5%D8%A7%D9%84%D8%AD_%D8%A7%D9%84%D9%81%D9%88%D8%B2%D8%A7%D9%86',
    ],
  },
  {
    type: 'Person',
    name: 'Ibn Taymiyyah',
    bioSlug: 'shaykh-al-islam-ibn-taymiyyah',
    jobTitle: 'Islamisk lärd',
    names: ['Shaykh ul-islām Ibn Taymiyyah', 'S̲hayk̲h ul-islām Ibn Taymiyyah'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q491558',
      'https://en.wikipedia.org/wiki/Ibn_Taymiyya',
      'https://ar.wikipedia.org/wiki/%D8%A7%D8%A8%D9%86_%D8%AA%D9%8A%D9%85%D9%8A%D8%A9',
    ],
  },
  {
    type: 'Person',
    name: 'Muḥammad Nāsir al-Dīn al-Albānī',
    bioSlug: 'muhammad-nasir-ud-din-al-albani',
    jobTitle: 'Islamisk lärd',
    names: ['Shaykh Muḥammad Nāsir al-Dīn al-Albāni', 'Shaykh al-Albāni', 'al-Albāni'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q560078',
      'https://en.wikipedia.org/wiki/Al-Albani',
      'https://ar.wikipedia.org/wiki/%D9%85%D8%AD%D9%85%D8%AF_%D9%86%D8%A7%D8%B5%D8%B1_%D8%A7%D9%84%D8%AF%D9%8A%D9%86_%D8%A7%D9%84%D8%A3%D9%84%D8%A8%D8%A7%D9%86%D9%8A',
    ],
  },
  {
    type: 'Person',
    name: 'Ibn al-Qayyim al-Djawziyyah',
    bioSlug: 'ibn-qayyim-al-jawziyyah',
    jobTitle: 'Islamisk lärd',
    names: ['Ibn Qayyim al-Jawziyyah', 'Ibn al-Qayyim'],
    sameAs: [
      'https://www.wikidata.org/wiki/Q119679',
      'https://en.wikipedia.org/wiki/Ibn_Qayyim_al-Jawziyya',
      'https://ar.wikipedia.org/wiki/%D8%A7%D8%A8%D9%86_%D9%82%D9%8A%D9%85_%D8%A7%D9%84%D8%AC%D9%88%D8%B2%D9%8A%D8%A9',
    ],
  },
]

// Placeholder bylines that are not real authors → emit no author entity.
const NON_AUTHORS = new Set(['n/a', 'na', 'sammanstallning'])

/**
 * Fold transliteration variants together: strip combining diacritics (so ā→a,
 * ḥ→h, s̲h→sh) and the various ´ ' ʿ marks, lowercase, collapse whitespace.
 * Makes byline matching robust to the spelling inconsistencies in the content.
 */
function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-̲ͯ]/g, '')
    .replace(/[´`'’‘ʿʾʻ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const BY_NAME = new Map<string, AuthorEntity>()
for (const entity of ENTITIES) {
  for (const name of entity.names) BY_NAME.set(normalize(name), entity)
}

/** The registered entity for a byline string, if recognised. */
export function findAuthorEntity(author: string | undefined): AuthorEntity | undefined {
  if (!author) return undefined
  return BY_NAME.get(normalize(author))
}

/** True for placeholder bylines (`n/a`, `Sammanställning`) that aren't authors. */
export function isNonAuthor(author: string | undefined): boolean {
  return author != null && NON_AUTHORS.has(normalize(author))
}

/** Path to the author's biography page, if one exists. */
export function bioHrefForAuthor(author: string | undefined): string | undefined {
  const entity = findAuthorEntity(author)
  return entity?.bioSlug ? `/biografier/${entity.bioSlug}/` : undefined
}

/** The entity a biography page is about, keyed by its slug. */
export function entityByBioSlug(slug: string): AuthorEntity | undefined {
  return ENTITIES.find((entity) => entity.bioSlug === slug)
}
