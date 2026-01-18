/**
 * Report script that finds terms without definitions in the glossary.
 * Helps identify:
 *   a) Terms in glossary without definitions
 *   b) Italic terms in content not in glossary
 *   c) Frequency of each term
 *
 * Run with: pnpm tsx scripts/find-undefined-terms.ts
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { findGlossaryTerm } from '../src/data/glossary.js'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const TERMS_FILE = path.join(process.cwd(), 'src', 'data', 'italicized-terms.json')

interface TermEntry {
  canonical: string
  variants: string[]
}

interface TermCategory {
  description: string
  terms: TermEntry[]
}

interface TermsData {
  description: string
  categories: Record<string, TermCategory>
}

async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'granskning') continue
      files.push(...(await walkDirectory(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function findItalicTerms(content: string): Map<string, number> {
  const terms = new Map<string, number>()
  // Match *term* (single word or short phrase, not full sentences)
  const pattern = /\*([^*]{1,50})\*/g
  const matches = content.matchAll(pattern)

  for (const match of matches) {
    const term = match[1]
    // Skip if it looks like a sentence or book title
    if (term.includes('.') || term.split(' ').length > 5) continue
    // Skip if it's a hadith reference
    if (/^\d+$/.test(term)) continue

    terms.set(term, (terms.get(term) || 0) + 1)
  }

  return terms
}

async function loadAllKnownTerms(): Promise<Set<string>> {
  const content = await fs.readFile(TERMS_FILE, 'utf-8')
  const data: TermsData = JSON.parse(content)
  const knownTerms = new Set<string>()

  for (const category of Object.values(data.categories)) {
    for (const term of category.terms) {
      knownTerms.add(term.canonical.toLowerCase())
      for (const variant of term.variants) {
        knownTerms.add(variant.toLowerCase())
      }
    }
  }

  return knownTerms
}

async function main() {
  console.log('Finding Undefined Terms')
  console.log('=======================\n')

  const files = await walkDirectory(CONTENT_DIR)
  const knownTerms = await loadAllKnownTerms()

  // Track all italic terms found in content
  const allItalicTerms = new Map<string, number>()

  // Process all files
  for (const file of files) {
    const fileContent = await fs.readFile(file, 'utf-8')
    const { content } = matter(fileContent)
    const terms = findItalicTerms(content)

    for (const [term, count] of terms) {
      allItalicTerms.set(term, (allItalicTerms.get(term) || 0) + count)
    }
  }

  // Categorize terms
  const termsInGlossary = new Map<string, number>()
  const termsKnownNoDefinition = new Map<string, number>()
  const unknownTerms = new Map<string, number>()

  for (const [term, count] of allItalicTerms) {
    const glossaryTerm = findGlossaryTerm(term)
    if (glossaryTerm) {
      termsInGlossary.set(term, count)
    } else if (knownTerms.has(term.toLowerCase())) {
      termsKnownNoDefinition.set(term, count)
    } else {
      unknownTerms.set(term, count)
    }
  }

  // Sort by frequency
  const sortByCount = (a: [string, number], b: [string, number]) => b[1] - a[1]

  // Report: Terms in glossary (with definitions)
  console.log(`1. Terms with definitions in glossary: ${termsInGlossary.size}`)
  const glossaryTermsSorted = [...termsInGlossary.entries()].sort(sortByCount)
  console.log('   Top 10 by frequency:')
  for (const [term, count] of glossaryTermsSorted.slice(0, 10)) {
    console.log(`     ${term}: ${count} occurrences`)
  }

  // Report: Known terms without definitions
  console.log(`\n2. Known terms WITHOUT definitions: ${termsKnownNoDefinition.size}`)
  const knownNoDefSorted = [...termsKnownNoDefinition.entries()].sort(sortByCount)
  console.log('   These are in italicized-terms.json but have no extracted definition:')
  for (const [term, count] of knownNoDefSorted.slice(0, 20)) {
    console.log(`     ${term}: ${count} occurrences`)
  }
  if (knownNoDefSorted.length > 20) {
    console.log(`     ... and ${knownNoDefSorted.length - 20} more`)
  }

  // Report: Unknown italic terms
  console.log(`\n3. Unknown italic terms (not in glossary): ${unknownTerms.size}`)
  const unknownSorted = [...unknownTerms.entries()].sort(sortByCount)
  console.log('   Most frequent (consider adding to glossary):')
  for (const [term, count] of unknownSorted.slice(0, 30)) {
    if (count >= 2) {
      // Only show terms that appear more than once
      console.log(`     ${term}: ${count} occurrences`)
    }
  }

  // Summary
  console.log('\n=======================')
  console.log('Summary')
  console.log('=======================')
  console.log(`Total unique italic terms found: ${allItalicTerms.size}`)
  console.log(`Terms with glossary definitions: ${termsInGlossary.size}`)
  console.log(`Known terms needing definitions: ${termsKnownNoDefinition.size}`)
  console.log(`Unknown terms to consider: ${unknownTerms.size}`)

  // Calculate coverage
  const totalOccurrences = [...allItalicTerms.values()].reduce((a, b) => a + b, 0)
  const coveredOccurrences = [...termsInGlossary.values()].reduce((a, b) => a + b, 0)
  const coverage = ((coveredOccurrences / totalOccurrences) * 100).toFixed(1)
  console.log(`\nGlossary coverage: ${coverage}% of all italic term occurrences`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
