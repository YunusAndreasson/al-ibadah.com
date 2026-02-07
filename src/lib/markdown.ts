/**
 * Strip markdown formatting from text
 * Removes bold, italic, links, footnotes, headers, etc.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove footnote references [^1]
      .replace(/\[\^[\w-]+\]/g, '')
      // Remove inline links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove reference links [text][ref]
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      // Remove bold **text** or __text__
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // Remove italic *text* or _text_
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove inline code `code`
      .replace(/`([^`]+)`/g, '$1')
      // Remove headers # ## ###
      .replace(/^#{1,6}\s+/gm, '')
      // Remove blockquotes >
      .replace(/^>\s+/gm, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  )
}
