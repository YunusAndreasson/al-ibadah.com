import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Footer } from '~/components/layout/Footer'
import { Header } from '~/components/layout/Header'
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
  component: CategoryPage,
})

function CategoryPage() {
  const { category } = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main" className="w-full max-w-3xl mx-auto px-4 py-8 flex-1">
        <h1 className="page-title mb-8">{data.name}</h1>

        {data.subcategories.length > 0 ? (
          <div className="grid gap-3">
            {data.subcategories.map((sub) => (
              <Link
                key={sub.slug}
                to={`/${category}/${sub.slug}`}
                className="group flex items-center justify-between p-4 sm:p-5 border border-border rounded-lg hover-border"
              >
                <span className="font-medium group-hover:text-foreground">{sub.name}</span>
                <span className="text-sm text-muted-foreground">
                  {sub.articleCount} {sub.articleCount === 1 ? 'artikel' : 'artiklar'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Inga underkategorier i denna kategori än.</p>
        )}
      </main>

      <Footer />
    </div>
  )
}
