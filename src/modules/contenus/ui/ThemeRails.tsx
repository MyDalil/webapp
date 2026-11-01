import type { ReactNode } from 'react'
import Link from '@/platform/ui/Link'
import type { Theme } from '../officiel/themes'

/** Thèmes des démarches sur deux lignes qui défilent à l’horizontale, sous la barre de recherche. */
export function ThemeRails({ themes, lead }: { themes: Theme[]; lead?: ReactNode }) {
  const chip = (t: Theme) => (
    <Link key={t.key} href={`/demarches/theme/${t.key}`} className="theme-chip" style={{ ['--tc' as string]: t.tone }}>
      <span className="theme-chip-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d={t.d} />
        </svg>
      </span>
      {t.label}
    </Link>
  )
  return (
    <nav className="theme-rails" aria-label="Thèmes des démarches">
      <div className="theme-rail">
        {lead}
        {themes.filter((t) => t.row === 1).map(chip)}
      </div>
      <div className="theme-rail">{themes.filter((t) => t.row === 2).map(chip)}</div>
    </nav>
  )
}
