import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Breadcrumbs } from '~/components/layout/Breadcrumbs'
import { PageLayout } from '~/components/layout/PageLayout'
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
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.subcategoryName} - al-Ibadah` }],
  }),
  component: SubcategoryPage,
})

function SubcategoryPage() {
  const { category, subcategory } = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <PageLayout>
      <Breadcrumbs
        items={[
          { label: 'Hem', href: '/' },
          { label: data.categoryName, href: `/${category}` },
        ]}
      />

      <h1 className="page-title mb-8 mt-8">{data.subcategoryName}</h1>

      {data.articles.length > 0 ? (
        <div className="flex flex-col">
          {data.articles.map((article, index) => (
            <Link
              key={article.slug}
              to={`/${category}/${subcategory}/${article.slug}`}
              preload="viewport"
              className={`nav-link py-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${index === 0 ? 'border-t' : ''}`}
            >
              {article.title}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Inga artiklar i denna underkategori än.</p>
      )}
    </PageLayout>
  )
}
