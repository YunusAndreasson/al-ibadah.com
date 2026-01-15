import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '~/components/ui/ThemeToggle'
import { SearchDialog } from '~/components/ui/SearchDialog'
import { SearchIcon } from '~/components/ui/icons'
import { useState, useEffect } from 'react'

const navLinks = [
  { to: '/troslara', label: 'Troslära' },
  { to: '/renhet', label: 'Renhet' },
  { to: '/bon', label: 'Bön' },
  { to: '/allmosa', label: 'Allmosa' },
  { to: '/fasta', label: 'Fasta' },
  { to: '/vallfard', label: 'Vallfärd' },
  { to: '/blandat', label: 'Blandat' },
]

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function handleOpenSearch() {
      setSearchOpen(true)
    }
    document.addEventListener('open-search', handleOpenSearch)
    return () => document.removeEventListener('open-search', handleOpenSearch)
  }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <a href="#main" className="skip-link">
        Hoppa till huvudinnehåll
      </a>

      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="font-semibold tracking-tight hover:text-muted-foreground transition-colors"
          >
            al-Ibadah
          </Link>

          <nav className="hidden md:flex items-center gap-4" aria-label="Huvudnavigering">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <SearchButton onClick={() => setSearchOpen(true)} />
            <ThemeToggle />
            <MobileMenuButton
              isOpen={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            />
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="fixed inset-0 bg-black/40 animate-dialog-overlay" />
          <nav
            className="fixed top-14 right-0 w-64 max-w-[80vw] h-[calc(100vh-3.5rem)] bg-background border-l border-border p-4 animate-dialog-content overflow-y-auto"
            aria-label="Mobilnavigering"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="block px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    activeProps={{ className: 'text-foreground bg-muted' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      activeProps={{ className: 'text-foreground' }}
      activeOptions={{ includeSearch: false }}
    >
      {children}
    </Link>
  )
}

function SearchButton({ onClick }: { onClick: () => void }) {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/30 rounded-lg transition-colors press-scale"
      aria-label="Sök (kortkommando: Ctrl+K)"
    >
      <SearchIcon size={14} />
      <span className="hidden sm:inline">Sök</span>
      <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
        {isMac ? '⌘K' : 'Ctrl+K'}
      </kbd>
    </button>
  )
}

function MobileMenuButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      className="md:hidden p-2 -mr-2 hover:bg-muted rounded-lg transition-colors press-scale"
      aria-label={isOpen ? 'Stäng meny' : 'Öppna meny'}
      aria-expanded={isOpen}
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isOpen ? (
          <>
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </>
        ) : (
          <>
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </>
        )}
      </svg>
    </button>
  )
}
