/**
 * Content Selection Algorithm
 * Selects articles for startpage sections based on occasion and configuration
 */

import { type ContentSource, OCCASION_CONTENT_CONFIG } from '~/data/occasion-config'
import { getNextUpcomingOccasion, type OccasionType } from '~/lib/hijri'
import { getDailyRotationSeed, selectWithRotation } from './rotation'
import type { CompactArticle, SectionContent, SelectionOptions } from './types'

/** Default max question length for startpage cards */
const DEFAULT_MAX_QUESTION_LENGTH = 400

/**
 * Get articles from a specific subcategory path
 * e.g., "fasta/nattbon" -> articles whose id starts with "fasta/nattbon/"
 */
function getArticlesBySubcategory(
  articles: CompactArticle[],
  subcategoryPath: string
): CompactArticle[] {
  return articles.filter((a) => a.id.startsWith(subcategoryPath + '/'))
}

/**
 * Get articles by keyword match (in title or description)
 */
function getArticlesByKeyword(articles: CompactArticle[], keyword: string): CompactArticle[] {
  const lowerKeyword = keyword.toLowerCase()
  return articles.filter((article) => {
    const titleMatch = article.title.toLowerCase().includes(lowerKeyword)
    const descMatch = article.description?.toLowerCase().includes(lowerKeyword)
    return titleMatch || descMatch
  })
}

/**
 * Get article by exact path
 */
function getArticleByPath(articles: CompactArticle[], path: string): CompactArticle | undefined {
  return articles.find((article) => '/' + article.id === path)
}

/**
 * Get articles for a content source
 */
function getArticlesForSource(articles: CompactArticle[], source: ContentSource): CompactArticle[] {
  switch (source.type) {
    case 'subcategory':
      return getArticlesBySubcategory(articles, source.value)
    case 'keyword':
      return getArticlesByKeyword(articles, source.value)
    case 'path': {
      const article = getArticleByPath(articles, source.value)
      return article ? [article] : []
    }
    default:
      return []
  }
}

/**
 * Select articles for a specific occasion or section type
 */
function selectArticlesForSection(
  type: OccasionType | 'deep-reads' | 'important-questions',
  articles: CompactArticle[],
  options: SelectionOptions = { maxCount: 5 }
): SectionContent | null {
  const config = OCCASION_CONTENT_CONFIG[type]
  if (!config) return null

  const { maxCount, minWordCount, maxQuestionLength, excludePaths, seed } = options
  const effectiveMinWordCount = minWordCount ?? config.minWordCount ?? 0
  const effectiveMaxQuestionLength = maxQuestionLength ?? DEFAULT_MAX_QUESTION_LENGTH
  const effectiveSeed = seed ?? getDailyRotationSeed()

  // Collect all matching articles from content sources
  const matchingArticles = new Map<string, CompactArticle>()

  for (const source of config.contentSources) {
    const sourceArticles = getArticlesForSource(articles, source)
    for (const article of sourceArticles) {
      // Skip if already seen or excluded
      if (matchingArticles.has(article.id)) continue
      if (excludePaths?.has(article.id)) continue

      // Filter by word count if specified
      if (effectiveMinWordCount > 0 && article.wordCount < effectiveMinWordCount) {
        continue
      }

      // Filter by question length to ensure questions fit in featured cards
      if (article.questionText && article.questionText.length > effectiveMaxQuestionLength) {
        continue
      }

      matchingArticles.set(article.id, article)
    }
  }

  // Convert to array and select with rotation
  const articleArray = Array.from(matchingArticles.values())

  if (articleArray.length === 0) return null

  // Sort by word count descending for deep reads (prioritize longer articles)
  const sortedArticles =
    type === 'deep-reads' ? articleArray.sort((a, b) => b.wordCount - a.wordCount) : articleArray

  const selectedArticles = selectWithRotation(sortedArticles, maxCount, effectiveSeed)

  return {
    type,
    titleSv: config.titleSv,
    titleAr: config.titleAr,
    articles: selectedArticles,
  }
}

/**
 * Get all startpage sections based on active occasions
 */
export function getStartpageSections(
  occasions: OccasionType[],
  articles: CompactArticle[],
  date: Date = new Date()
): SectionContent[] {
  const sections: SectionContent[] = []
  const usedPaths = new Set<string>()
  const seed = getDailyRotationSeed(date)

  // Add seasonal sections based on active occasions (max 3)
  const occasionsToShow = occasions.slice(0, 3)
  for (const occasionType of occasionsToShow) {
    const section = selectArticlesForSection(occasionType, articles, {
      maxCount: 5,
      excludePaths: usedPaths,
      seed,
    })

    if (section && section.articles.length > 0) {
      sections.push(section)
      for (const article of section.articles) {
        usedPaths.add(article.id)
      }
    }
  }

  // If no active occasions, show the next upcoming major occasion
  if (sections.length === 0) {
    const upcoming = getNextUpcomingOccasion()
    if (upcoming) {
      const section = selectArticlesForSection(upcoming.type, articles, {
        maxCount: 5,
        excludePaths: usedPaths,
        seed,
      })

      if (section && section.articles.length > 0) {
        sections.push({
          ...section,
          titleSv: `Snart: ${section.titleSv}`,
          isUpcoming: true,
          daysUntil: upcoming.daysUntil,
        })
        for (const article of section.articles) {
          usedPaths.add(article.id)
        }
      }
    }
  }

  // Always add Deep Reads section
  const deepReads = selectArticlesForSection('deep-reads', articles, {
    maxCount: 5,
    minWordCount: 800,
    excludePaths: usedPaths,
    seed,
  })

  if (deepReads && deepReads.articles.length > 0) {
    sections.push(deepReads)
    for (const article of deepReads.articles) {
      usedPaths.add(article.id)
    }
  }

  // Always add Important Questions section
  const importantQuestions = selectArticlesForSection('important-questions', articles, {
    maxCount: 5,
    excludePaths: usedPaths,
    seed,
  })

  if (importantQuestions && importantQuestions.articles.length > 0) {
    sections.push(importantQuestions)
  }

  return sections
}
