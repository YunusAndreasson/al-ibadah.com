import type { ComponentType } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { SearchIcon } from './icons'

type SearchDialogProps = { open: boolean; onClose: () => void }

export function SearchIsland() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [SearchDialog, setSearchDialog] = useState<ComponentType<SearchDialogProps> | null>(null)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (searchOpen && !SearchDialog) {
      import('./SearchDialog').then((m) => {
        setSearchDialog(() => m.SearchDialog as ComponentType<SearchDialogProps>)
      })
    }
  }, [searchOpen, SearchDialog])

  return (
    <>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="nav-link flex items-center gap-1.5 p-1.5 press-scale cursor-pointer"
        aria-label="Sök (snabbkommando: Ctrl+K)"
      >
        <SearchIcon size={16} />
        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>

      {searchOpen && SearchDialog && (
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </>
  )
}
