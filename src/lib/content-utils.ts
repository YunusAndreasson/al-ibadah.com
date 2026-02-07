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
  'Monoteism': 'tawhīd',
  'Avgudadyrkan': 'shirk',
  'Innovationer': 'bid\u00B4ah',
  'Gravlivet': 'barzakh',
  'Trosbekännelsen': 'shahādah',
  'Medel för åkallan': 'tawassul',
  'Förutbestämmelsen': 'qadar',
  // renhet
  'Den stora tvagningen': 'ghusl',
  'Tvagning utan vatten': 'tayammum',
  'Tvagning': 'wudū\u2019',
  'Månadsblödning': 'hayd',
  'Efterblödning': 'nifās',
  'Strykning över strumpor': 'mash',
  // bön
  'Böneutrop': 'adhān',
  'Det andra böneutropet': 'iqāmah',
  'Koncentration i bönen': 'khushū\u00B4',
  'Nattbön': 'qiyām al-layl',
  'Avskärmning i bönen': 'sutrah',
  'Begravningsbön': 'salāt al-janāzah',
  'Fredagsbönen': 'salāt al-jumu\u00B4ah',
  'Eid-bönen': 'salāt al-\u00B4īd',
  // allmosa
  'Fasteallmosa': 'zakāt al-fitr',
  // fasta
  'Allmaktens Natt': 'laylat al-qadr',
  'Ramadanens nattbön': 'tarāwīh',
  // vallfärd
  'Vallfärdens stationer': 'mawāqīt',
  'Rundvandring och löpning': 'tawāf & sa\u00B4ī',
  'Förbud i helgtillståndet': 'ihrām',
  'Pilgrimskläder': 'ihrām',
  'Helgtillståndet och avsikt': 'ihrām',
  'Mindre vallfärd': '\u00B4umrah',
  'Högtidsoffret': 'udhiyah',
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
