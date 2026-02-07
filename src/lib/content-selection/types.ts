/**
 * Content Selection Types
 */

import type { OccasionType } from '~/lib/hijri'

export interface CompactArticle {
  id: string
  title: string
  titleHtml?: string
  author?: string
  description?: string
  wordCount: number
  questionText?: string
}

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
  articles: CompactArticle[]
  isUpcoming?: boolean
  daysUntil?: number
}
