import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Breadcrumbs } from '~/components/layout/Breadcrumbs'
import { PageLayout } from '~/components/layout/PageLayout'
import { getCategoryInfo } from '~/lib/content'

const getCategoryData = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: category }) => {
    const info = await getCategoryInfo(category)
    if (!info) {
      throw notFound()
    }
    return info
  })

export const Route = createFileRoute('/$category/')({
  loader: async ({ params }) => {
    return getCategoryData({ data: params.category })
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name} - al-Ibadah` }],
  }),
  component: CategoryPage,
})

function CategoryPage() {
  const { category } = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <PageLayout>
      <Breadcrumbs
        items={[
          { label: 'Hem', href: '/' },
        ]}
      />

      <h1 className="page-title mb-8 mt-8">{data.name}</h1>

      {data.subcategories.length > 0 ? (
        <div className="flex flex-col gap-2">
          {data.subcategories.map((sub) => (
            <Link
              key={sub.slug}
              to={`/${category}/${sub.slug}`}
              preload="viewport"
              className="nav-link py-2 px-3 rounded border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Inga underkategorier i denna kategori än.</p>
      )}
    </PageLayout>
  )
}
