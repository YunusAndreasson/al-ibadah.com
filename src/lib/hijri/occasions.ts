/**
 * Occasion Detection Logic
 * Detects active Islamic occasions based on current date
 */

import { OCCASION_CONTENT_CONFIG } from '~/data/occasion-config'
import { getCurrentHijriDate } from './calendar'
import type { HijriDate, Occasion, OccasionType } from './types'

/**
 * Occasion-specific metadata (priority and descriptions)
 * Titles are sourced from OCCASION_CONTENT_CONFIG to avoid duplication
 */
const OCCASION_METADATA: Record<OccasionType, { basePriority: number; description?: string }> = {
  ramadan: { basePriority: 1, description: 'Den heliga fastemånaden' },
  'laylatul-qadr': { basePriority: 1, description: 'Natten som är bättre än tusen månader' },
  'eid-al-fitr': { basePriority: 1, description: 'Fastebrottets högtid' },
  'hajj-season': { basePriority: 1, description: 'Vallfärdens dagar' },
  'day-of-arafah': { basePriority: 1, description: 'Den bästa dagen på året' },
  'eid-al-adha': { basePriority: 1, description: 'Offerhögtiden' },
  ashura: { basePriority: 1, description: 'Tionde Muharram' },
  'white-days': { basePriority: 4, description: 'Månens fulla dagar (13-15)' },
  friday: { basePriority: 2, description: 'Veckans bästa dag' },
  'monday-fasting': { basePriority: 5, description: 'Rekommenderad fastedag' },
  'thursday-fasting': { basePriority: 5, description: 'Rekommenderad fastedag' },
}

/**
 * Get occasion definition by combining titles from config with metadata
 */
function getOccasionDef(type: OccasionType) {
  const config = OCCASION_CONTENT_CONFIG[type]
  const meta = OCCASION_METADATA[type]
  return {
    titleSv: config.titleSv,
    titleAr: config.titleAr,
    basePriority: meta.basePriority,
    description: meta.description,
  }
}

/**
 * Detect active occasions based on current Hijri and Gregorian dates
 */
export function detectOccasions(date: Date = new Date(), hijriDate?: HijriDate): Occasion[] {
  const hijri = hijriDate ?? getCurrentHijriDate()
  const occasions: Occasion[] = []
  const weekday = date.getDay() // 0 = Sunday, 5 = Friday

  // Ramadan (Month 9)
  if (hijri.month === 9) {
    occasions.push({ type: 'ramadan', ...getOccasionDef('ramadan'), priority: 1 })

    // Laylatul Qadr (last 10 nights of Ramadan, odd nights have higher priority)
    if (hijri.day >= 21) {
      const isOdd = hijri.day % 2 === 1
      occasions.push({ type: 'laylatul-qadr', ...getOccasionDef('laylatul-qadr'), priority: isOdd ? 1 : 2 })
    }
  }

  // Eid al-Fitr (Month 10, Day 1)
  if (hijri.month === 10 && hijri.day === 1) {
    occasions.push({ type: 'eid-al-fitr', ...getOccasionDef('eid-al-fitr'), priority: 1 })
  }

  // Hajj Season (Month 12, Days 8-13)
  if (hijri.month === 12 && hijri.day >= 8 && hijri.day <= 13) {
    occasions.push({ type: 'hajj-season', ...getOccasionDef('hajj-season'), priority: 1 })

    // Day of Arafah (Month 12, Day 9)
    if (hijri.day === 9) {
      occasions.push({ type: 'day-of-arafah', ...getOccasionDef('day-of-arafah'), priority: 1 })
    }

    // Eid al-Adha (Month 12, Day 10)
    if (hijri.day === 10) {
      occasions.push({ type: 'eid-al-adha', ...getOccasionDef('eid-al-adha'), priority: 1 })
    }
  }

  // Ashura (Month 1, Days 9-11, Day 10 = highest priority)
  if (hijri.month === 1 && hijri.day >= 9 && hijri.day <= 11) {
    occasions.push({ type: 'ashura', ...getOccasionDef('ashura'), priority: hijri.day === 10 ? 1 : 2 })
  }

  // White Days (Days 13-15 of any month)
  if (hijri.day >= 13 && hijri.day <= 15) {
    occasions.push({ type: 'white-days', ...getOccasionDef('white-days'), priority: 4 })
  }

  // Friday (Gregorian weekday = 5)
  if (weekday === 5) {
    occasions.push({ type: 'friday', ...getOccasionDef('friday'), priority: 2 })
  }

  // Monday fasting (Gregorian weekday = 1)
  if (weekday === 1) {
    occasions.push({ type: 'monday-fasting', ...getOccasionDef('monday-fasting'), priority: 5 })
  }

  // Thursday fasting (Gregorian weekday = 4)
  if (weekday === 4) {
    occasions.push({ type: 'thursday-fasting', ...getOccasionDef('thursday-fasting'), priority: 5 })
  }

  // Sort by priority (lower number = higher priority)
  return occasions.sort((a, b) => a.priority - b.priority)
}

/**
 * Major occasions with their Hijri dates (for calculating upcoming)
 */
const MAJOR_OCCASIONS: Array<{
  type: OccasionType
  month: number
  startDay: number
  endDay?: number
}> = [
  { type: 'ashura', month: 1, startDay: 9, endDay: 11 },
  { type: 'ramadan', month: 9, startDay: 1, endDay: 30 },
  { type: 'hajj-season', month: 12, startDay: 8, endDay: 13 },
]

/**
 * Calculate days between two Hijri dates (approximate)
 * Uses 29.5 days per month average
 */
function approximateDaysBetween(from: HijriDate, toMonth: number, toDay: number): number {
  const DAYS_PER_MONTH = 29.5

  let monthDiff = toMonth - from.month
  if (monthDiff < 0) {
    monthDiff += 12 // Next year
  }

  const dayDiff = toDay - from.day
  return Math.round(monthDiff * DAYS_PER_MONTH + dayDiff)
}

/**
 * Find the next upcoming major occasion
 */
export function getNextUpcomingOccasion(hijriDate?: HijriDate): Occasion | null {
  const hijri = hijriDate ?? getCurrentHijriDate()

  let closest: { occasion: (typeof MAJOR_OCCASIONS)[0]; daysUntil: number } | null = null

  for (const occ of MAJOR_OCCASIONS) {
    let daysUntil = approximateDaysBetween(hijri, occ.month, occ.startDay)

    // If the occasion is currently active or just passed, calculate for next year
    if (daysUntil <= 0) {
      // Check if we're currently in the occasion
      if (
        hijri.month === occ.month &&
        hijri.day >= occ.startDay &&
        hijri.day <= (occ.endDay ?? occ.startDay)
      ) {
        // Currently active, skip
        continue
      }
      // Already passed, calculate for next year
      daysUntil += Math.round(12 * 29.5)
    }

    if (!closest || daysUntil < closest.daysUntil) {
      closest = { occasion: occ, daysUntil }
    }
  }

  if (!closest) return null

  const def = getOccasionDef(closest.occasion.type)
  return {
    type: closest.occasion.type,
    titleSv: def.titleSv,
    titleAr: def.titleAr,
    priority: def.basePriority,
    description: def.description,
    isUpcoming: true,
    daysUntil: closest.daysUntil,
  }
}
