import Link from '@/platform/ui/Link'
import { Icon } from '@/platform/ui/Icon'
import type { Procedure } from '@/payload-types'

const host = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

/** Liste de démarches (format service-public.gouv.fr) : titre, à quoi elle sert, accès direct au site officiel. */
export function ProcedureRows({ items }: { items: Procedure[] }) {
  return (
    <ul className="sr-list op-list">
      {items.map((p) => (
        <li key={p.slug} className="op-row">
          <Link href={`/demarches/${p.slug}`} className="sr-row is-wrap">
            <span className={`sr-icon${p.online ? ' is-online' : ''}`} aria-hidden="true">
              <Icon name={p.online ? 'check' : 'file'} />
            </span>
            <span className="sr-text">
              <b>{p.title}</b>
              <small>{p.summary}</small>
            </span>
            <span />
            <span className="sr-chev" aria-hidden="true">
              ›
            </span>
          </Link>
          {p.online && p.onlineUrl && (
            <a className="op-go" href={p.onlineUrl} target="_blank" rel="noopener noreferrer">
              Faire en ligne · {p.platform || host(p.onlineUrl)} ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
