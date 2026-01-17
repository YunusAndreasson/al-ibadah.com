import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadDelay: 30, // Faster preload trigger (default: 50ms)
    defaultPreloadStaleTime: Infinity, // Content is static, never refetch
    defaultStaleTime: Infinity, // Cache loader data indefinitely
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
