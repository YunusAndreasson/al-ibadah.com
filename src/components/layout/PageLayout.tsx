import { Footer } from './Footer'
import { Header } from './Header'

interface PageLayoutProps {
  children: React.ReactNode
  largePadding?: boolean
}

export function PageLayout({ children, largePadding }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main
        id="main"
        className={`w-full max-w-3xl mx-auto px-4 flex-1 ${
          largePadding ? 'py-12 sm:py-16' : 'py-6 sm:py-8'
        }`}
      >
        {children}
      </main>
      <Footer />
    </div>
  )
}
