/**
 * Hijri Calendar Conversion
 * Uses hijri-rrule for accurate Umm al-Qura calendar calculations
 */

import { gregorianToHijri as gregorianToHijriLib } from 'hijri-rrule'
import type { HijriDate } from './types'

/**
 * Get current Hijri date
 */
export function getCurrentHijriDate(): HijriDate {
  const result = gregorianToHijriLib(new Date())
  return {
    year: result.year,
    month: result.month,
    day: result.day,
  }
}
