import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { SearchIcon, SparklesIcon } from '~/components/ui/icons'

interface IndexItem {
  title: string
  path: string
  category: string
  author?: string
}

interface AiResult {
  path: string
  title: string
  category?: string
  snippet: string
}

interface FeaturedAnswer {
  path: string
  title: string
  category?: string
  author?: string
  question?: string
  paragraphs: string[]
  truncated: boolean
}

interface SearchResponse {
  results?: { path: string; snippet: string }[]
  answer?: {
    path: string
    question?: string
    paragraphs: string[]
    truncated: boolean
  } | null
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

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px shrink-0"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function AskSearch({ children, articleCount }: AskSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AiResult[]>([])
  const [answer, setAnswer] = useState<FeaturedAnswer | null>(null)
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
      setAnswer(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    const controller = new AbortController()
    const timer = setTimeout(() => {
      ensureIndex().then((index) => {
        const titleOf = (path: string) =>
          index.get(path)?.title ?? (path.split('/').pop() ?? path).replace(/-/g, ' ')

        fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
          .then((data: SearchResponse) => {
            const featured: FeaturedAnswer | null = data.answer
              ? {
                  path: data.answer.path,
                  question: data.answer.question,
                  paragraphs: data.answer.paragraphs,
                  truncated: data.answer.truncated,
                  title: titleOf(data.answer.path),
                  category: index.get(data.answer.path)?.category,
                  author: index.get(data.answer.path)?.author,
                }
              : null
            const list: AiResult[] = (data.results ?? [])
              .filter((r) => r.path !== featured?.path)
              .map((r) => ({
                path: r.path,
                snippet: r.snippet,
                title: titleOf(r.path),
                category: index.get(r.path)?.category,
              }))
            setAnswer(featured)
            setResults(list)
            setStatus('done')
          })
          .catch((err) => {
            if ((err as Error).name !== 'AbortError') {
              setAnswer(null)
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
            {status === 'loading' && !answer && results.length === 0 && (
              <div className="rounded-xl border border-border p-5 sm:p-6" aria-hidden="true">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="mt-3 h-5 w-2/3 rounded bg-muted animate-pulse" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
                </div>
              </div>
            )}

            {answer && (
              <article className="rounded-xl border border-border bg-background p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2">
                  <SparklesIcon size={14} className="shrink-0 text-subtle-foreground" />
                  <span className="section-label !text-[0.8125rem] text-subtle-foreground">
                    {answer.question ? 'Svar ur texten' : 'Ur texten'}
                  </span>
                  {answer.category && (
                    <span className="ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {answer.category}
                    </span>
                  )}
                </div>
                <a href={answer.path} className="group block">
                  <h3 className="font-sans text-lg font-semibold leading-snug text-foreground group-hover:underline">
                    {answer.title}
                  </h3>
                </a>
                {answer.question && (
                  <p className="mt-1 line-clamp-2 text-sm italic text-subtle-foreground">
                    Frågan: ”{answer.question}”
                  </p>
                )}
                <div className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed text-foreground">
                  {answer.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {answer.truncated && <p className="text-muted-foreground">…</p>}
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-subtle-foreground">
                    <CheckIcon />
                    <span>
                      Ordagrant ur den publicerade texten. AI:n väljer det mest relevanta stycket —
                      men skriver inget eget och hittar inte på något.
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {answer.author && (
                      <span className="text-xs text-subtle-foreground">— {answer.author}</span>
                    )}
                    <a
                      href={answer.path}
                      className="ml-auto text-sm font-medium text-foreground hover:underline"
                    >
                      Läs hela utlåtandet →
                    </a>
                  </div>
                </div>
              </article>
            )}

            {results.length > 0 && (
              <div className={answer ? 'mt-8' : ''}>
                {answer ? (
                  <p className="section-label mb-3 !text-[0.8125rem] text-muted-foreground">
                    Fler relevanta utlåtanden
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">
                    Inget direkt svar hittades — men dessa utlåtanden kan vara relevanta:
                  </p>
                )}
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
              </div>
            )}

            {status === 'done' && !answer && results.length === 0 && (
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
