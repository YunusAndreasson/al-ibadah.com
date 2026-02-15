import { useEffect, useState } from 'preact/hooks'

interface NavLink {
  href: string
  label: string
}

interface MobileMenuProps {
  navLinks: NavLink[]
  currentPath: string
}

export function MobileMenu({ navLinks, currentPath }: MobileMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)

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

  // Close menu on ClientRouter navigation
  useEffect(() => {
    const close = () => setMenuOpen(false)
    document.addEventListener('astro:before-swap', close)
    return () => document.removeEventListener('astro:before-swap', close)
  }, [])

  return (
    <>
      <button
        type="button"
        className="md:hidden p-2 -mr-2 rounded-lg hover-bg press-scale"
        aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
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
          {menuOpen ? (
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

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="fixed inset-0 bg-foreground/40 animate-dialog-overlay" />
          <nav
            className="fixed top-14 right-0 w-64 max-w-[80vw] h-[calc(100dvh-3.5rem)] bg-background border-l border-border p-4 animate-slide-in-right overflow-y-auto safe-bottom"
            aria-label="Mobilnavigering"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`nav-link block px-3 py-2.5 rounded-lg hover-bg ${
                      currentPath.startsWith(link.href) ? 'active bg-muted' : ''
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
