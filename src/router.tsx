import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-foreground">Sidan hittades inte</h1>
      <p className="mt-2 text-muted-foreground">Sidan du söker finns inte eller har flyttats.</p>
      <a href="/" className="mt-4 text-primary hover:underline">
        Tillbaka till startsidan
      </a>
    </div>
  )
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadDelay: 30, // Faster preload trigger (default: 50ms)
    defaultPreloadStaleTime: Infinity, // Content is static, never refetch
    defaultStaleTime: Infinity, // Cache loader data indefinitely
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
