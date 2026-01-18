import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="w-full mt-auto">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-8">
        <p className="text-xs text-subtle-foreground">
          <Link to="/om" className="hover:text-foreground transition-colors">
            Om webbplatsen
          </Link>
        </p>
      </div>
    </footer>
  )
}
