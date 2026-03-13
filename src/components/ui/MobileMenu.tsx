import { useEffect, useRef, useState } from 'preact/hooks'

interface NavLink {
  href: string
  label: string
}

interface MobileMenuProps {
  navLinks: NavLink[]
  footerLinks: NavLink[]
  currentPath: string
}

export function MobileMenu({ navLinks, footerLinks, currentPath }: MobileMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      // Move focus into the nav panel
      navRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
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
        ref={buttonRef}
        type="button"
        className="md:hidden p-2 -mr-2 rounded-lg hover-bg press-scale cursor-pointer"
        aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
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
            ref={navRef}
            id="mobile-nav"
            tabIndex={-1}
            className="fixed top-[calc(3.5rem+env(safe-area-inset-top))] right-0 w-64 max-w-[80vw] h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] bg-background border-l border-border p-4 animate-slide-in-right overflow-y-auto safe-bottom flex flex-col outline-none"
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

            <div className="mt-auto pt-4 border-t border-border">
              <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="nav-link text-xs text-subtle-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
