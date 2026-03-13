import { useEffect, useRef, useState } from 'preact/hooks'

type Theme = 'light' | 'dark' | 'system'

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const hasInteracted = useRef(false)

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)

    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem('theme', theme)

    const meta = document.getElementById('theme-color')
    if (meta) meta.setAttribute('content', isDark ? '#1c1410' : '#f9f4ee')
  }, [theme])

  const cycleTheme = () => {
    hasInteracted.current = true
    setTheme((current) => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'system'
      return 'light'
    })
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="nav-link p-2 rounded-lg hover-bg press-scale cursor-pointer"
      aria-label={`Nuvarande tema: ${theme === 'system' ? 'automatiskt' : theme === 'light' ? 'ljust' : 'mörkt'}. Klicka för att byta.`}
    >
      <span key={theme} className={`block ${hasInteracted.current ? 'animate-icon-in' : ''}`}>
        {theme === 'system' && <SystemIcon />}
        {theme === 'light' && <SunIcon />}
        {theme === 'dark' && <MoonIcon />}
      </span>
    </button>
  )
}

function SunIcon() {
  return (
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function SystemIcon() {
  return (
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
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}
