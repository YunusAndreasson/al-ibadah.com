/**
 * Hijri Calendar Types
 */

export interface HijriDate {
  year: number
  month: number // 1-12
  day: number // 1-30
}

export type OccasionType =
  | 'ramadan'
  | 'laylatul-qadr'
  | 'eid-al-fitr'
  | 'hajj-season'
  | 'day-of-arafah'
  | 'eid-al-adha'
  | 'ashura'
  | 'white-days'
  | 'friday'
  | 'monday-fasting'
  | 'thursday-fasting'

export interface Occasion {
  type: OccasionType
  titleSv: string
  titleAr: string
  priority: number
  description?: string
  isUpcoming?: boolean
  daysUntil?: number
}
