import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArticleRenderer } from '~/components/content/ArticleRenderer'
import { Breadcrumbs } from '~/components/layout/Breadcrumbs'
import { PageLayout } from '~/components/layout/PageLayout'
import { getArticle, getSubcategoryInfo } from '~/lib/content'

const getArticleData = createServerFn({ method: 'GET' })
  .inputValidator((d: { category: string; subcategory: string; slug: string }) => d)
  .handler(async ({ data }) => {
    const [article, subcategoryInfo] = await Promise.all([
      getArticle(data.category, data.subcategory, data.slug),
      getSubcategoryInfo(data.category, data.subcategory),
    ])

    if (!article) {
      throw notFound()
    }

    return {
      article,
      categoryName: subcategoryInfo?.categoryName || data.category,
      subcategoryName: subcategoryInfo?.subcategoryName || data.subcategory,
    }
  })

export const Route = createFileRoute('/$category/$subcategory/$slug')({
  loader: async ({ params }) => {
    return getArticleData({
      data: {
        category: params.category,
        subcategory: params.subcategory,
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
  const { category, subcategory } = Route.useParams()
  const { article, categoryName, subcategoryName } = Route.useLoaderData()

  return (
    <PageLayout>
      <Breadcrumbs
        items={[
          { label: 'Hem', href: '/' },
          { label: categoryName, href: `/${category}` },
          { label: subcategoryName, href: `/${category}/${subcategory}` },
        ]}
      />

      <ArticleRenderer article={article} />
    </PageLayout>
  )
}
