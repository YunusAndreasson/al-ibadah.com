import { useEffect, useRef } from 'react'
import type { Article } from '~/lib/markdown'
import { ShareButton } from '~/components/ui/ShareButton'

interface ArticleRendererProps {
  article: Article
}

export function ArticleRenderer({ article }: ArticleRendererProps) {
  const { frontmatter, html } = article
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contentRef.current) return

    const container = contentRef.current
    const footnoteRefs = container.querySelectorAll('a[data-footnote-ref]')
    if (footnoteRefs.length === 0) return

    // Build footnote text map once - O(n)
    const footnoteTexts = new Map<string, string>()
    container.querySelectorAll('li[id^="user-content-fn-"]').forEach((li) => {
      const clone = li.cloneNode(true) as HTMLElement
      clone.querySelectorAll('a[data-footnote-backref]').forEach((el) => el.remove())
      footnoteTexts.set(li.id, clone.textContent?.trim() || '')
    })

    // Apply tooltips using map lookup - O(n)
    footnoteRefs.forEach((ref) => {
      const href = ref.getAttribute('href')
      if (!href) return
      const footnoteId = href.replace('#', '')
      const text = footnoteTexts.get(footnoteId)
      if (text) ref.setAttribute('data-tooltip', text)
    })
  }, [html])

  return (
    <article className="mt-8 max-w-[65ch]">
      <header className="mb-8 sm:mb-10">
        <h1 className="page-title mb-4">{frontmatter.title}</h1>

        <div className="flex items-start justify-between gap-4">
          {(frontmatter.author || frontmatter.source) && (
            <div className="text-sm text-muted-foreground space-y-1">
              {frontmatter.author && (
                <p>
                  <span className="font-medium">Författare:</span> {frontmatter.author}
                </p>
              )}
              {frontmatter.source && (
                <p>
                  <span className="font-medium">Källa:</span> {frontmatter.source}
                </p>
              )}
            </div>
          )}
          <ShareButton title={frontmatter.title} />
        </div>
      </header>

      <div ref={contentRef} className="prose-reading" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
