/**
 * Content Selection Algorithm
 * Selects articles for startpage sections based on occasion and configuration
 */

import { type ContentSource, OCCASION_CONTENT_CONFIG } from '~/data/occasion-config'
import { type ArticleData, contentData } from '~/generated/content-data'
import { getNextUpcomingOccasion, type OccasionType } from '~/lib/hijri'
import { getDailyRotationSeed, selectWithRotation } from './rotation'
import type { SectionContent, SelectionOptions } from './types'

/**
 * Get all articles from the content data as a flat array
 */
function getAllArticles(): ArticleData[] {
  const articles: ArticleData[] = []

  for (const category of contentData) {
    articles.push(...category.articles)
    for (const subcategory of category.subcategories) {
      articles.push(...subcategory.articles)
    }
  }

  return articles
}

/**
 * Get articles from a specific subcategory path
 * e.g., "fasta/nattbon" -> articles in /fasta/nattbon/*
 */
function getArticlesBySubcategory(subcategoryPath: string): ArticleData[] {
  const [categorySlug, subcategorySlug] = subcategoryPath.split('/')

  const category = contentData.find((c) => c.slug === categorySlug)
  if (!category) return []

  const subcategory = category.subcategories.find((s) => s.slug === subcategorySlug)
  if (!subcategory) return []

  return subcategory.articles
}

/**
 * Get articles by keyword match (in title or description)
 */
function getArticlesByKeyword(keyword: string): ArticleData[] {
  const allArticles = getAllArticles()
  const lowerKeyword = keyword.toLowerCase()

  return allArticles.filter((article) => {
    const titleMatch = article.title.toLowerCase().includes(lowerKeyword)
    const descMatch = article.description?.toLowerCase().includes(lowerKeyword)
    return titleMatch || descMatch
  })
}

/**
 * Get article by exact path
 */
function getArticleByPath(path: string): ArticleData | undefined {
  const allArticles = getAllArticles()
  return allArticles.find((article) => article.path === path)
}

/**
 * Get articles for a content source
 */
function getArticlesForSource(source: ContentSource): ArticleData[] {
  switch (source.type) {
    case 'subcategory':
      return getArticlesBySubcategory(source.value)
    case 'keyword':
      return getArticlesByKeyword(source.value)
    case 'path': {
      const article = getArticleByPath(source.value)
      return article ? [article] : []
    }
    default:
      return []
  }
}

/**
 * Select articles for a specific occasion or section type
 */
export function selectArticlesForSection(
  type: OccasionType | 'deep-reads' | 'important-questions',
  options: SelectionOptions = { maxCount: 5 }
): SectionContent | null {
  const config = OCCASION_CONTENT_CONFIG[type]
  if (!config) return null

  const { maxCount, minWordCount, excludePaths, seed } = options
  const effectiveMinWordCount = minWordCount ?? config.minWordCount ?? 0
  const effectiveSeed = seed ?? getDailyRotationSeed()

  // Collect all matching articles from content sources
  const matchingArticles = new Map<string, ArticleData>()

  for (const source of config.contentSources) {
    const articles = getArticlesForSource(source)
    for (const article of articles) {
      // Skip if already seen or excluded
      if (matchingArticles.has(article.path)) continue
      if (excludePaths?.has(article.path)) continue

      // Filter by word count if specified
      if (effectiveMinWordCount > 0 && article.wordCount < effectiveMinWordCount) {
        continue
      }

      matchingArticles.set(article.path, article)
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
  date: Date = new Date()
): SectionContent[] {
  const sections: SectionContent[] = []
  const usedPaths = new Set<string>()
  const seed = getDailyRotationSeed(date)

  // Add seasonal sections based on active occasions (max 3)
  const occasionsToShow = occasions.slice(0, 3)
  for (const occasionType of occasionsToShow) {
    const section = selectArticlesForSection(occasionType, {
      maxCount: 5,
      excludePaths: usedPaths,
      seed,
    })

    if (section && section.articles.length > 0) {
      sections.push(section)
      for (const article of section.articles) {
        usedPaths.add(article.path)
      }
    }
  }

  // If no active occasions, show the next upcoming major occasion
  if (sections.length === 0) {
    const upcoming = getNextUpcomingOccasion()
    if (upcoming) {
      const section = selectArticlesForSection(upcoming.type, {
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
          usedPaths.add(article.path)
        }
      }
    }
  }

  // Always add Deep Reads section
  const deepReads = selectArticlesForSection('deep-reads', {
    maxCount: 5,
    minWordCount: 800,
    excludePaths: usedPaths,
    seed,
  })

  if (deepReads && deepReads.articles.length > 0) {
    sections.push(deepReads)
    for (const article of deepReads.articles) {
      usedPaths.add(article.path)
    }
  }

  // Always add Important Questions section
  const importantQuestions = selectArticlesForSection('important-questions', {
    maxCount: 5,
    excludePaths: usedPaths,
    seed,
  })

  if (importantQuestions && importantQuestions.articles.length > 0) {
    sections.push(importantQuestions)
  }

  return sections
}
