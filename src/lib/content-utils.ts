export const CATEGORY_NAMES: Record<string, string> = {
  troslara: 'Troslära',
  renhet: 'Renhet',
  bon: 'Bön',
  allmosa: 'Allmosa',
  fasta: 'Fasta',
  vallfard: 'Vallfärd',
  blandat: 'Blandat',
  biografier: 'Biografier',
}

/**
 * Clean category name by removing bracketed/parenthesized annotations
 */
function cleanCategoryName(name: string): string {
  return name
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
}

/**
 * Well-known Arabic terms for subcategory names.
 * Keyed by the Swedish display name as returned by deriveSubcategoryName.
 */
export const ARABIC_TERMS: Record<string, string> = {
  // troslära
  'Monoteism': 'tawḥīd',
  'Avgudadyrkan': 's̲hirk',
  'Innovationer': 'bid´ah',
  'Gravlivet': 'barzak̲h',
  'Trosbekännelsen': 's̲hahādah',
  'Medel för åkallan': 'tawassul',
  'Förutbestämmelsen': 'qadar',
  // renhet
  'Den stora tvagningen': 'g̲husl',
  'Tvagning utan vatten': 'tayammum',
  'Tvagning': 'wuḍū\u2019',
  'Månadsblödning': 'ḥayḍ',
  'Efterblödning': 'nifās',
  'Strykning över strumpor': 'mas̲h',
  // bön
  'Böneutrop': 'ad̲hān',
  'Det andra böneutropet': 'iqāmah',
  'Koncentration i bönen': 'k̲hus̲hū´',
  'Nattbön': 'qiyām al-layl',
  'Avskärmning i bönen': 'sutrah',
  'Begravningsbön': 'ṣalāt al-janāzah',
  'Fredagsbönen': 'ṣalāt al-jumu´ah',
  'Eid-bönen': 'ṣalāt al-´īd',
  // allmosa
  'Fasteallmosa': 'zakātul-fiṭr',
  // fasta
  'Allmaktens Natt': 'laylat al-qadr',
  'Ramadanens nattbön': 'tarāwīḥ',
  // vallfärd
  'Vallfärdens stationer': 'mawāqīt',
  'Rundvandring och löpning': 'ṭawāf & sa´ī',
  'Förbud i helgtillståndet': 'iḥrām',
  'Pilgrimskläder': 'iḥrām',
  'Helgtillståndet och avsikten': 'iḥrām',
  'Mindre vallfärd': '´umrah',
  'Högtidsoffret': 'uḍḥiyah',
}

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  troslara: 'Utlåtanden och svar om islamisk troslära, monoteism, avgudadyrkan, innovationer och trosbekännelsen.',
  renhet: 'Utlåtanden och svar om rituell renhet, tvagning, den stora tvagningen (ghusl), tayammum och månadsblödning.',
  bon: 'Utlåtanden och svar om den islamiska bönen, böneutrop, fredagsbönen, nattbönen och begravningsbönen.',
  allmosa: 'Utlåtanden och svar om allmosan (zakāt), fasteallmosan (zakātul-fiṭr) och välgörenhet.',
  fasta: 'Utlåtanden och svar om fastan under Ramadan, frivillig fasta, resenärens fasta och Allmaktens Natt.',
  vallfard: 'Utlåtanden och svar om vallfärden (ḥajj), den mindre vallfärden (´umrah) och högtidsoffret.',
  blandat: 'Utlåtanden och svar om blandade ämnen som åkallan, äktenskap, ekonomi, klädsel och ånger.',
  biografier: 'Biografier om framstående islamiska lärda.',
}

export function getArabicTerm(name: string): string | undefined {
  return ARABIC_TERMS[name]
}

/**
 * Derive a subcategory display name from an article's categories field
 */
export function deriveSubcategoryName(categories: string[], fallbackSlug: string): string {
  if (categories.length >= 2) {
    return cleanCategoryName(categories[1])
  }

  // Fallback: title-case the slug
  return fallbackSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
