import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArticleRenderer } from '~/components/content/ArticleRenderer'
import { Breadcrumbs } from '~/components/layout/Breadcrumbs'
import { PageLayout } from '~/components/layout/PageLayout'
import { getArticle, getCategoryInfo } from '~/lib/content'

const getArticleData = createServerFn({ method: 'GET' })
  .inputValidator((d: { category: string; slug: string }) => d)
  .handler(async ({ data }) => {
    const [article, categoryInfo] = await Promise.all([
      getArticle(data.category, undefined, data.slug),
      getCategoryInfo(data.category),
    ])

    if (!article) {
      throw notFound()
    }

    return {
      article,
      categoryName: categoryInfo?.name || data.category,
    }
  })

export const Route = createFileRoute('/$category/$slug')({
  loader: async ({ params }) => {
    return getArticleData({
      data: {
        category: params.category,
        slug: params.slug,
      },
    })
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.article.frontmatter.title} - al-Ibadah` },
      {
        name: 'description',
        content: loaderData?.article.frontmatter.description || '',
      },
    ],
  }),
  component: ArticlePage,
})

function ArticlePage() {
  const { category } = Route.useParams()
  const { article, categoryName } = Route.useLoaderData()

  return (
    <PageLayout>
      <Breadcrumbs
        items={[
          { label: 'Hem', href: '/' },
          { label: categoryName, href: `/${category}` },
        ]}
      />

      <ArticleRenderer article={article} />
    </PageLayout>
  )
}
