/**
 * Rehype plugin to add 'qa-label' class to Fråga:/Svar: labels
 */

import type { Element, Root } from 'hast'
import { visit } from 'unist-util-visit'

export function rehypeQaLabels() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'p') return

      const firstChild = node.children[0]
      if (firstChild && firstChild.type === 'element' && firstChild.tagName === 'strong') {
        const textNode = firstChild.children[0]
        if (textNode && textNode.type === 'text' && /^(Fråga|Svar):/.test(textNode.value)) {
          firstChild.properties = firstChild.properties || {}
          firstChild.properties.className = ['qa-label']
        }
      }
    })
  }
}

