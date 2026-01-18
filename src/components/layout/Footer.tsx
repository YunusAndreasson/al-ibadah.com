import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="w-full mt-auto">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-8">
        <p className="text-xs text-subtle-foreground flex gap-4">
          <Link to="/om" className="hover:text-foreground transition-colors">
            Om webbplatsen
          </Link>
          <Link to="/termer" className="hover:text-foreground transition-colors">
            Ordlista
          </Link>
        </p>
      </div>
    </footer>
  )
}
