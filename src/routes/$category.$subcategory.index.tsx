import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Header } from '~/components/layout/Header'
import { Footer } from '~/components/layout/Footer'
import { Breadcrumbs } from '~/components/layout/Breadcrumbs'
import { getSubcategoryInfo } from '~/lib/content'

const getSubcategoryData = createServerFn({ method: 'GET' })
  .inputValidator((d: { category: string; subcategory: string }) => d)
  .handler(async ({ data }) => {
    const info = await getSubcategoryInfo(data.category, data.subcategory)
    if (!info) {
      throw notFound()
    }
    return info
  })

export const Route = createFileRoute('/$category/$subcategory/')({
  loader: async ({ params }) => {
    return getSubcategoryData({
      data: { category: params.category, subcategory: params.subcategory },
    })
  },
  component: SubcategoryPage,
})

function SubcategoryPage() {
  const { category, subcategory } = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="w-full max-w-3xl mx-auto px-4 py-8 flex-1">
        <Breadcrumbs
          items={[
            { label: 'Hem', href: '/' },
            { label: data.categoryName, href: `/${category}` },
          ]}
        />

        <h1 className="page-title mb-8 mt-8">
          {data.subcategoryName}
        </h1>

        {data.articles.length > 0 ? (
          <div className="grid gap-3">
            {data.articles.map((article) => (
              <Link
                key={article.slug}
                to={`/${category}/${subcategory}/${article.slug}`}
                className="group block p-4 sm:p-5 border border-border rounded-lg hover-border"
              >
                <h2 className="font-medium mb-1 group-hover:text-foreground">{article.title}</h2>
                {article.author && (
                  <p className="text-sm text-muted-foreground">
                    {article.author}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Inga artiklar i denna underkategori än.
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}
