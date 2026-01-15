/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'al-Ibadah - Islamisk kunskapsbas' },
      {
        name: 'description',
        content: 'En kunskapsbank om islamisk dyrkan och teologi på svenska.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // DNS prefetch for external resources
      { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
      // Preconnect to font origins (with crossorigin for fonts.gstatic.com)
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      // Preload critical Inter font (UI font, most important)
      {
        rel: 'preload',
        href: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      // Load fonts with display=swap for fast text rendering
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;1,7..72,400&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap',
      },
    ],
    scripts: [
      // Minified theme detection script - prevents flash of wrong theme
      {
        children: `(function(){var t=localStorage.getItem("theme")||"system",d=t==="dark"||t==="system"&&matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.classList.toggle("dark",d)})()`,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: JSX.Element }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
