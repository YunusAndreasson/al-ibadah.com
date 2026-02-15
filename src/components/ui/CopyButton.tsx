import { useCallback, useEffect, useState } from 'preact/hooks'

interface CopyButtonProps {
  title: string
  category?: string
  author?: string
  source?: string
}

export function CopyButton({ title, category, author, source }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const prose = document.querySelector('.prose-reading')
    if (!prose) return

    const bodyText = extractText(prose)
    const lines: string[] = [`# ${title}`]

    if (category) lines.push(`Kategori: ${category}`)
    if (author) lines.push(`Författare: ${author}`)
    if (source) lines.push(`Källa: ${source}`)
    lines.push('Källa: al-Ibadah.se')

    lines.push('', bodyText)

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
  }, [title, category, author, source])

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      aria-label="Kopiera text"
    >
      {copied ? (
        <>
          <CheckIcon />
          <span>Kopierad</span>
        </>
      ) : (
        <>
          <CopyIcon />
          <span>Kopiera text</span>
        </>
      )}
    </button>
  )
}

function extractText(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement

  // Remove footnotes section
  clone.querySelectorAll('.footnotes').forEach((el) => {
    el.remove()
  })

  // Convert strong to markdown bold
  clone.querySelectorAll('strong').forEach((el) => {
    el.replaceWith(`**${el.textContent}**`)
  })

  // Convert em to markdown italic
  clone.querySelectorAll('em').forEach((el) => {
    el.replaceWith(`*${el.textContent}*`)
  })

  // Convert blockquotes
  clone.querySelectorAll('blockquote').forEach((el) => {
    const text = el.textContent?.trim() || ''
    const quoted = text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    el.replaceWith(quoted)
  })

  return clone.textContent?.trim() || ''
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
