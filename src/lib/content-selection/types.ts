/**
 * Content Selection Types
 */

import type { ArticleData } from '~/generated/content-data'
import type { OccasionType } from '~/lib/hijri'

export interface SelectionOptions {
  maxCount: number
  minWordCount?: number
  maxQuestionLength?: number
  excludePaths?: Set<string>
  seed?: number
}

export interface SectionContent {
  type: OccasionType | 'deep-reads' | 'important-questions'
  titleSv: string
  titleAr: string
  articles: ArticleData[]
  isUpcoming?: boolean
  daysUntil?: number
}
