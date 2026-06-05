import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { SearchIcon, SparklesIcon } from '~/components/ui/icons'

interface IndexItem {
  title: string
  path: string
  category: string
}

interface AiResult {
  path: string
  title: string
  category?: string
  snippet: string
}

interface AskSearchProps {
  /** The curated homepage sections, shown when the user is not searching. */
  children?: ComponentChildren
  articleCount?: number
}

// Natural-language prompts that showcase what semantic search can do here.
const EXAMPLES = [
  'Vad bryter fastan?',
  'Hur gör man tayammum?',
  'Får man be sittande om man är sjuk?',
  'Glömska under bönen',
]

function navigateTo(path: string) {
  import('astro:transitions/client')
    .then(({ navigate }) => navigate(path))
    .catch(() => {
      window.location.href = path
    })
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function AskSearch({ children, articleCount }: AskSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AiResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const indexRef = useRef<Map<string, IndexItem> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // The search index (titles + categories) is fetched lazily on first query so
  // the homepage stays light. AI results only return a path + snippet; we look
  // up the title and category here to render rich cards.
  async function ensureIndex(): Promise<Map<string, IndexItem>> {
    if (indexRef.current) return indexRef.current
    try {
      const data: IndexItem[] = await fetch('/search-index.json').then((r) => r.json())
      indexRef.current = new Map(data.map((item) => [item.path, item]))
    } catch {
      indexRef.current = new Map()
    }
    return indexRef.current
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: ensureIndex is stable (indexRef); only re-run when the query changes
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }
    setStatus('loading')
    const controller = new AbortController()
    const timer = setTimeout(() => {
      ensureIndex().then((index) => {
        fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
          .then((data: { results?: { path: string; snippet: string }[] }) => {
            const enriched: AiResult[] = (data.results ?? []).map((r) => {
              const meta = index.get(r.path)
              return {
                path: r.path,
                snippet: r.snippet,
                title: meta?.title ?? (r.path.split('/').pop() ?? r.path).replace(/-/g, ' '),
                category: meta?.category,
              }
            })
            setResults(enriched)
            setStatus('done')
          })
          .catch((err) => {
            if ((err as Error).name !== 'AbortError') {
              setResults([])
              setStatus('error')
            }
          })
      })
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const trimmed = query.trim()
  const hasQuery = trimmed.length >= 2
  const countHint = articleCount
    ? `över ${(Math.floor(articleCount / 100) * 100).toLocaleString('sv-SE')}`
    : ''

  function pickExample(example: string) {
    setQuery(example)
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && results[0]) {
      e.preventDefault()
      navigateTo(results[0].path)
    } else if (e.key === 'Escape' && query) {
      e.preventDefault()
      setQuery('')
    }
  }

  return (
    <div>
      <div className="mb-10">
        <div className="mb-2.5 flex items-center gap-1.5 text-subtle-foreground">
          <SparklesIcon size={14} />
          <span className="section-label !text-[0.8125rem]">Fråga med egna ord</span>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 transition-all focus-within:border-ring focus-within:shadow-dialog">
          <SearchIcon size={20} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="Ställ en fråga om bön, fasta, renhet…"
            aria-label="Ställ en fråga"
            autoComplete="off"
            autoCorrect="off"
            spellcheck={false}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Rensa sökningen"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover-bg press-scale"
            >
              <XIcon />
            </button>
          )}
        </div>

        {!hasQuery && (
          <div className="mt-3">
            <p className="mb-2.5 text-sm text-subtle-foreground">
              {countHint ? `Sök med egna ord i ${countHint} utlåtanden. Prova:` : 'Prova:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => pickExample(example)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover-bg press-scale transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasQuery && (
          <div className="mt-6 animate-fade-up">
            {status === 'loading' && results.length === 0 && (
              <div className="grid gap-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-border p-4 sm:p-5">
                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                    <div className="mt-3 h-3 w-full rounded bg-muted animate-pulse" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Mest relevanta utlåtanden för{' '}
                  <span className="font-medium text-foreground">”{trimmed}”</span>
                </p>
                <div className="grid gap-3">
                  {results.map((r) => (
                    <a key={r.path} href={r.path} className="card group block">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-sans text-base font-semibold leading-snug text-foreground">
                          {r.title}
                        </h3>
                        {r.category && (
                          <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {r.category}
                          </span>
                        )}
                      </div>
                      {r.snippet && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {r.snippet}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </>
            )}

            {status === 'done' && results.length === 0 && (
              <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                Inga träffar för ”{trimmed}”. Prova att formulera om frågan eller använd andra ord.
              </p>
            )}

            {status === 'error' && (
              <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                AI-sökningen är inte tillgänglig just nu. Försök igen om en stund.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Curated homepage sections — hidden while actively searching. */}
      <div hidden={hasQuery}>{children}</div>
    </div>
  )
}
