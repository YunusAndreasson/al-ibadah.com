import { useMemo } from 'react'
import { getStartpageSections, type SectionContent } from '~/lib/content-selection'
import { detectOccasions, type Occasion, type OccasionType } from '~/lib/hijri'

interface UseCurrentOccasionsResult {
  occasions: Occasion[]
  sections: SectionContent[]
  activeOccasionTypes: OccasionType[]
}

/**
 * Hook to detect current Islamic occasions and get startpage sections
 */
export function useCurrentOccasions(): UseCurrentOccasionsResult {
  return useMemo(() => {
    const now = new Date()
    const occasions = detectOccasions(now)
    const activeOccasionTypes = occasions.map((o) => o.type)
    const sections = getStartpageSections(activeOccasionTypes, now)

    return {
      occasions,
      sections,
      activeOccasionTypes,
    }
  }, [])
}
