/**
 * Remark plugin that transforms *term* (emphasis) into glossary tooltips.
 *
 * For terms found in the glossary, transforms:
 *   *term* -> <em class="glossary-term" data-definition="...">term</em>
 *
 * Used during the build process in build-content.ts
 */

import type { Emphasis, Root, Text } from 'mdast'
import { visit } from 'unist-util-visit'
import { findGlossaryTerm } from '../src/data/glossary.js'

interface EmphasisWithData extends Emphasis {
  data?: {
    hName?: string
    hProperties?: Record<string, unknown>
  }
}

export function remarkGlossaryTerms() {
  return (tree: Root) => {
    visit(tree, 'emphasis', (node: Emphasis) => {
      // Only process simple emphasis nodes with a single text child
      if (node.children.length !== 1) return
      const child = node.children[0]
      if (child.type !== 'text') return

      const text = (child as Text).value
      const glossaryTerm = findGlossaryTerm(text)

      if (glossaryTerm) {
        // Transform to HTML with data attribute
        // We use hProperties which rehype will pick up
        const nodeWithData = node as EmphasisWithData
        nodeWithData.data = {
          hName: 'em',
          hProperties: {
            className: ['glossary-term'],
            'data-definition': glossaryTerm.definition,
          },
        }
      }
    })
  }
}

export default remarkGlossaryTerms
