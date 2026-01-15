import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Header } from '~/components/layout/Header'
import { Footer } from '~/components/layout/Footer'
import { Breadcrumbs } from '~/components/layout/Breadcrumbs'
import { ArticleRenderer } from '~/components/content/ArticleRenderer'
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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="w-full max-w-3xl mx-auto px-4 py-8 flex-1">
        <Breadcrumbs
          items={[
            { label: 'Hem', href: '/' },
            { label: categoryName, href: `/${category}` },
            { label: subcategoryName, href: `/${category}/${subcategory}` },
          ]}
        />

        <ArticleRenderer article={article} />
      </main>

      <Footer />
    </div>
  )
}
