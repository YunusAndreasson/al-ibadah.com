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
