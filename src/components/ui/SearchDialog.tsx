import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ArticleIcon, SearchIcon } from '~/components/ui/icons'

interface SearchItem {
  title: string
  path: string
  category: string
  subcategory?: string
  arabicTerm?: string
}

const indexPromise: Promise<SearchItem[]> = fetch('/search-index.json')
  .then((r) => r.json())
  .catch((): SearchItem[] => [])

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

function Kbd({ children }: { children: ComponentChildren }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  )
}

// Split text on the matched query (case-insensitive, literal) and bold the matches.
// Returns Preact nodes — no raw HTML, so no XSS risk and no broken tags.
function highlight(text: string, query: string) {
  const q = query.trim()
  if (!q) return text
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts: ComponentChildren[] = []
  let from = 0
  let idx = lower.indexOf(needle, from)
  if (idx === -1) return text
  let key = 0
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx))
    parts.push(
      <strong key={key++} className="font-semibold text-foreground">
        {text.slice(idx, idx + q.length)}
      </strong>
    )
    from = idx + q.length
    idx = lower.indexOf(needle, from)
  }
  if (from < text.length) parts.push(text.slice(from))
  return parts
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchIndex, setSearchIndex] = useState<SearchItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    indexPromise.then(setSearchIndex)
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    return searchIndex
      .filter(
        (item) => item.title.toLowerCase().includes(q) || item.arabicTerm?.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [query, searchIndex])

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keep the highlighted row scrolled into view during keyboard navigation
  useEffect(() => {
    ;(listRef.current?.children[selectedIndex] as HTMLElement | undefined)?.scrollIntoView({
      block: 'nearest',
    })
  }, [selectedIndex])

  // Lock body scroll and focus input when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      inputRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      setQuery('')
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex].path)
    }
  }

  function navigateTo(path: string) {
    onClose()
    // Use Astro's navigate for view-transition-aware navigation
    import('astro:transitions/client')
      .then(({ navigate }) => navigate(path))
      .catch(() => {
        window.location.href = path
      })
  }

  function handleSelect(item: SearchItem) {
    navigateTo(item.path)
  }

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sök"
    >
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm animate-dialog-overlay"
        aria-hidden="true"
      />

      <div className="min-h-dvh flex items-start justify-center p-4 pt-16 sm:pt-24">
        <div
          className="relative flex w-full max-w-xl flex-col bg-background rounded-xl border border-border shadow-dialog overflow-hidden animate-dialog-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <SearchIcon size={20} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sök artiklar…"
              className="flex-1 bg-transparent text-base text-foreground outline-none focus:outline-none focus-visible:outline-none placeholder:text-muted-foreground"
              aria-label="Sök artiklar"
              aria-autocomplete="list"
              aria-controls="search-results"
            />
          </div>

          {query.trim() ? (
            <div
              id="search-results"
              className="max-h-80 overflow-y-auto p-2 border-t border-border"
            >
              {results.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Inga träffar för &quot;{query}&quot;
                </p>
              ) : (
                <ul ref={listRef} role="listbox" aria-label="Sökresultat">
                  {results.map((item, index) => {
                    const selected = index === selectedIndex
                    return (
                      <li key={item.path} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          title={item.title}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg ${
                            selected ? 'bg-muted' : 'hover-bg'
                          }`}
                        >
                          <ArticleIcon
                            size={16}
                            className={`shrink-0 ${
                              selected ? 'text-foreground' : 'text-subtle-foreground'
                            }`}
                          />
                          <span className="flex-1 min-w-0 truncate text-left font-medium text-sm text-foreground">
                            {highlight(item.title, query)}
                          </span>
                          <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {item.category}
                          </span>
                          {selected && <Kbd>↵</Kbd>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground border-t border-border">
              {searchIndex.length > 0
                ? `Börja skriva för att söka bland ${searchIndex.length} artiklar`
                : 'Laddar…'}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex gap-0.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </span>
              bläddra
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↵</Kbd>
              öppna
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              stäng
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
