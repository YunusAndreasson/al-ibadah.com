import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SearchIcon } from '~/components/ui/icons'
import { getSearchIndex, type SearchItem } from '~/lib/content'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const searchIndex = useMemo(() => getSearchIndex(), [])

  const results = useMemo(() => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    return searchIndex.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 10)
  }, [query, searchIndex])

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!open) {
          document.dispatchEvent(new CustomEvent('open-search'))
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

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

  function handleKeyDown(e: React.KeyboardEvent) {
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
      navigate({ to: results[selectedIndex].path })
      onClose()
    }
  }

  function handleSelect(item: SearchItem) {
    navigate({ to: item.path })
    onClose()
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
      <div className="fixed inset-0 bg-black/40 animate-dialog-overlay" aria-hidden="true" />

      <div className="min-h-full flex items-start justify-center p-4 pt-20 sm:pt-24">
        <div
          className="relative w-full max-w-lg bg-background border border-border rounded-lg shadow-2xl overflow-hidden animate-dialog-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            <SearchIcon className="text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sök artiklar..."
              className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Sök artiklar"
              aria-autocomplete="list"
              aria-controls="search-results"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          {query.trim() && (
            <div id="search-results" className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Inga resultat för "{query}"
                </p>
              ) : (
                <ul role="listbox" aria-label="Sökresultat">
                  {results.map((item, index) => (
                    <li key={item.path} role="option" aria-selected={index === selectedIndex}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                          index === selectedIndex ? 'bg-muted' : ''
                        }`}
                      >
                        <p className="font-medium text-sm text-foreground leading-snug">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.category}
                          {item.subcategory && ` / ${item.subcategory}`}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!query.trim() && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Börja skriva för att söka bland {searchIndex.length} artiklar
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
