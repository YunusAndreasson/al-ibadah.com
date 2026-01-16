import { useEffect, useRef } from 'react'
import type { Article } from '~/lib/markdown'

interface ArticleRendererProps {
  article: Article
}

export function ArticleRenderer({ article }: ArticleRendererProps) {
  const { frontmatter, html } = article
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contentRef.current) return

    const footnoteRefs = contentRef.current.querySelectorAll('a[data-footnote-ref]')
    footnoteRefs.forEach((ref) => {
      const href = ref.getAttribute('href')
      if (!href) return

      const footnoteId = href.replace('#', '')
      const footnote = document.getElementById(footnoteId)
      if (!footnote) return

      // Get text content, removing the backref link
      const clone = footnote.cloneNode(true) as HTMLElement
      clone.querySelectorAll('a[data-footnote-backref]').forEach((el) => el.remove())
      const text = clone.textContent?.trim() || ''

      if (text) {
        ref.setAttribute('data-tooltip', text)
      }
    })
  }, [html])

  return (
    <article className="mt-8 max-w-[65ch]">
      <header className="mb-10">
        <h1 className="page-title mb-4">{frontmatter.title}</h1>

        {(frontmatter.author || frontmatter.source) && (
          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            {frontmatter.author && (
              <p>
                <span className="opacity-70">Författare:</span> {frontmatter.author}
              </p>
            )}
            {frontmatter.source && (
              <p>
                <span className="opacity-70">Källa:</span> {frontmatter.source}
              </p>
            )}
          </div>
        )}
      </header>

      <div ref={contentRef} className="prose-reading" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
