export function Footer() {
  return (
    <footer className="w-full mt-auto">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-8">
        <p className="text-xs text-subtle-foreground">
          <span className="uppercase tracking-widest">Est 2007</span>
          <span className="mx-2 opacity-50">·</span>
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.sv"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC-BY-4.0
          </a>
          <span className="mx-2 opacity-50">·</span>
          <a
            href="mailto:yunus@edenmind.com"
            className="hover:text-foreground transition-colors"
          >
            yunus@edenmind.com
          </a>
        </p>
      </div>
    </footer>
  )
}
