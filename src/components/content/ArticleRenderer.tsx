import type { Article } from '~/lib/markdown'

interface ArticleRendererProps {
  article: Article
}

export function ArticleRenderer({ article }: ArticleRendererProps) {
  const { frontmatter, html } = article

  return (
    <article className="mt-10">
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

      <div className="prose-reading" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
