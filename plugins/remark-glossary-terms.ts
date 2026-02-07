/**
 * Remark plugin that transforms terms into glossary tooltips.
 *
 * For italic terms (Arabic) found in the glossary, transforms:
 *   *term* -> <em class="glossary-term" data-definition="...">term</em>
 *
 * For plain text terms (Swedish) found in the glossary, transforms:
 *   term -> <span class="glossary-term" data-definition="...">term</span>
 *
 */

import type { Emphasis, Parent, Root, Text } from 'mdast'
import { visit } from 'unist-util-visit'
import { findGlossaryTerm, glossary } from '../src/data/glossary.js'

interface EmphasisData {
  hName?: string
  hProperties?: {
    className?: string[]
    'data-definition'?: string
  }
}

interface HtmlNode {
  type: 'html'
  value: string
}

// Build a regex pattern for Swedish terms only (non-italic matching)
// Use lookbehind/lookahead instead of \b since Swedish chars (åäö) don't work with \b
const swedishTerms = Object.values(glossary)
  .filter((term) => term.category === 'swedishTerms')
  .flatMap((term) => term.variants)
  .sort((a, b) => b.length - a.length) // Longer terms first to avoid partial matches

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Word boundary pattern that works with Swedish characters
const wordBoundaryStart = '(?<![a-zåäöA-ZÅÄÖ])'
const wordBoundaryEnd = '(?![a-zåäöA-ZÅÄÖ])'

const swedishTermsPattern =
  swedishTerms.length > 0
    ? new RegExp(
        `${wordBoundaryStart}(${swedishTerms.map((t) => escapeRegex(t)).join('|')})${wordBoundaryEnd}`,
        'gi'
      )
    : null

export function remarkGlossaryTerms() {
  return (tree: Root) => {
    // Handle emphasis nodes (Arabic terms in italics)
    visit(tree, 'emphasis', (node: Emphasis) => {
      // Only process simple emphasis nodes with a single text child
      if (node.children.length !== 1) return
      const child = node.children[0]
      if (child.type !== 'text') return

      const text = (child as Text).value
      const glossaryTerm = findGlossaryTerm(text)

      if (glossaryTerm) {
        // Transform to HTML with data attribute
        const nodeData: EmphasisData = {
          hName: 'em',
          hProperties: {
            className: ['glossary-term'],
            'data-definition': glossaryTerm.definition,
          },
        }
        ;(node as Emphasis & { data?: EmphasisData }).data = nodeData
      }
    })

    // Handle text nodes (Swedish terms in plain text)
    if (!swedishTermsPattern) return

    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return

      const text = node.value
      const matches: Array<{ term: string; start: number; end: number }> = []

      let match: RegExpExecArray | null
      swedishTermsPattern.lastIndex = 0

      while ((match = swedishTermsPattern.exec(text)) !== null) {
        const term = match[1]
        const glossaryTerm = findGlossaryTerm(term)
        if (glossaryTerm && glossaryTerm.category === 'swedishTerms') {
          matches.push({
            term: match[0],
            start: match.index,
            end: match.index + match[0].length,
          })
        }
      }

      if (matches.length === 0) return

      // Build new nodes: mix of text and html
      const newNodes: Array<Text | HtmlNode> = []
      let lastEnd = 0

      for (const m of matches) {
        // Text before the match
        if (m.start > lastEnd) {
          newNodes.push({ type: 'text', value: text.slice(lastEnd, m.start) })
        }

        // The glossary term as HTML
        const glossaryTerm = findGlossaryTerm(m.term)
        if (glossaryTerm) {
          const escapedDef = glossaryTerm.definition
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
          newNodes.push({
            type: 'html',
            value: `<span class="glossary-term" data-definition="${escapedDef}">${m.term}</span>`,
          })
        }

        lastEnd = m.end
      }

      // Text after last match
      if (lastEnd < text.length) {
        newNodes.push({ type: 'text', value: text.slice(lastEnd) })
      }

      // Replace the node with new nodes
      parent.children.splice(index, 1, ...newNodes)

      // Return the new index to continue visiting
      return index + newNodes.length
    })
  }
}

