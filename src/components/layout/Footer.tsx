export function Footer() {
  return (
    <footer className="w-full mt-auto">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-8">
        <p className="font-mono text-[11px] tracking-tight text-muted-foreground/50">
          <span className="uppercase tracking-widest">Est</span>
          <span className="mx-1.5 opacity-60">/</span>
          2007
          <span className="mx-3 opacity-30">·</span>
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.sv"
            className="underline decoration-transparent hover:decoration-current transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC-BY-4.0
          </a>
          <span className="mx-3 opacity-30">·</span>
          <a
            href="mailto:yunus@edenmind.com"
            className="underline decoration-transparent hover:decoration-current transition-colors"
          >
            yunus@edenmind.com
          </a>
        </p>
      </div>
    </footer>
  )
}
