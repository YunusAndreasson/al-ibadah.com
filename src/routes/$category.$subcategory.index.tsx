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
        <div className="grid gap-3">
          {data.articles.map((article) => (
            <Link
              key={article.slug}
              to="/$category/$subcategory/$slug"
              params={{ category, subcategory, slug: article.slug }}
              preload="viewport"
              className="card block"
            >
              <h2 className="font-medium mb-1 text-foreground">{article.title}</h2>
              {article.author && <p className="text-sm text-muted-foreground">{article.author}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Inga artiklar i denna underkategori än.</p>
      )}
    </PageLayout>
  )
}
