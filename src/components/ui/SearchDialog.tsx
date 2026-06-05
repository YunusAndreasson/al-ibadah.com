import type { ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ArticleIcon, SearchIcon, SparklesIcon } from '~/components/ui/icons'

interface SearchItem {
  title: string
  path: string
  category: string
  subcategory?: string
  arabicTerm?: string
}

interface AiResult {
  path: string
  title: string
  category?: string
  snippet: string
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

/** Fallback title when an AI result's path is not in the local index. */
function prettyTitleFromPath(path: string): string {
  const slug = path.split('/').pop() ?? path
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchIndex, setSearchIndex] = useState<SearchItem[]>([])
  const [aiResults, setAiResults] = useState<AiResult[]>([])
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    indexPromise.then(setSearchIndex)
  }, [])

  const indexByPath = useMemo(() => {
    const map = new Map<string, SearchItem>()
    for (const item of searchIndex) map.set(item.path, item)
    return map
  }, [searchIndex])

  // Instant, in-browser title matches (no network).
  const titleMatches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return searchIndex
      .filter(
        (item) => item.title.toLowerCase().includes(q) || item.arabicTerm?.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [query, searchIndex])

  // Semantic AI Search results, debounced, via the /api/search Pages Function.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setAiResults([])
      setAiStatus('idle')
      return
    }
    setAiStatus('loading')
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
        .then((data: { results?: { path: string; snippet: string }[] }) => {
          const enriched: AiResult[] = (data.results ?? []).map((r) => {
            const meta = indexByPath.get(r.path)
            return {
              path: r.path,
              snippet: r.snippet,
              title: meta?.title ?? prettyTitleFromPath(r.path),
              category: meta?.category,
            }
          })
          setAiResults(enriched)
          setAiStatus('done')
        })
        .catch((err) => {
          if ((err as Error).name !== 'AbortError') {
            setAiResults([])
            setAiStatus('error')
          }
        })
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, indexByPath])

  // Title matches that are not already surfaced by the AI section.
  const aiPaths = useMemo(() => new Set(aiResults.map((r) => r.path)), [aiResults])
  const titleResults = useMemo(
    () => titleMatches.filter((item) => !aiPaths.has(item.path)),
    [titleMatches, aiPaths]
  )

  // Combined keyboard-navigation order: AI results first, then title results.
  const navPaths = useMemo(
    () => [...aiResults.map((r) => r.path), ...titleResults.map((item) => item.path)],
    [aiResults, titleResults]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keep the highlighted row scrolled into view during keyboard navigation
  useEffect(() => {
    resultsRef.current
      ?.querySelector(`[data-idx="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
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
      setSelectedIndex((i) => Math.min(i + 1, navPaths.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && navPaths[selectedIndex]) {
      e.preventDefault()
      navigateTo(navPaths[selectedIndex])
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

  if (!open) {
    return null
  }

  const hasResults = navPaths.length > 0

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
              ref={resultsRef}
              className="max-h-96 overflow-y-auto p-2 border-t border-border"
            >
              {/* AI Search — prominent, semantic, full-text */}
              <div className="mb-1 flex items-center gap-2 px-3 pt-1 pb-2">
                <SparklesIcon size={15} className="text-foreground shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  AI-sökning
                </span>
                {aiStatus === 'loading' && (
                  <span className="text-[11px] text-muted-foreground">söker…</span>
                )}
                <span className="ml-auto text-[10px] uppercase tracking-wide text-subtle-foreground">
                  hela texten
                </span>
              </div>

              {aiResults.length > 0 ? (
                <ul role="listbox" aria-label="AI-sökresultat">
                  {aiResults.map((item, index) => {
                    const selected = index === selectedIndex
                    return (
                      <li key={item.path} role="option" aria-selected={selected} data-idx={index}>
                        <button
                          type="button"
                          onClick={() => navigateTo(item.path)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex w-full flex-col gap-1 px-3 py-2.5 rounded-lg text-left ${
                            selected ? 'bg-muted' : 'hover-bg'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 truncate font-medium text-sm text-foreground">
                              {item.title}
                            </span>
                            {item.category && (
                              <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                {item.category}
                              </span>
                            )}
                            {selected && <Kbd>↵</Kbd>}
                          </span>
                          {item.snippet && (
                            <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {item.snippet}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : aiStatus === 'done' ? (
                <p className="px-3 pb-2 text-xs text-muted-foreground">Inga AI-träffar.</p>
              ) : aiStatus === 'error' ? (
                <p className="px-3 pb-2 text-xs text-muted-foreground">
                  AI-sökningen är inte tillgänglig just nu.
                </p>
              ) : (
                <p className="px-3 pb-2 text-xs text-muted-foreground">söker…</p>
              )}

              {/* Instant title matches not already shown above */}
              {titleResults.length > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Titelträffar
                  </div>
                  <ul role="listbox" aria-label="Titelträffar">
                    {titleResults.map((item, j) => {
                      const index = aiResults.length + j
                      const selected = index === selectedIndex
                      return (
                        <li key={item.path} role="option" aria-selected={selected} data-idx={index}>
                          <button
                            type="button"
                            onClick={() => navigateTo(item.path)}
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
                </div>
              )}

              {!hasResults && aiStatus !== 'loading' && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Inga träffar för &quot;{query}&quot;
                </p>
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
