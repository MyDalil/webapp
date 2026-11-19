import type { Where } from 'payload'
import Link from '@/platform/ui/Link'
import { sponsoredItems } from '../sponsoring'
import { SPONSORED_LABEL, sponsoredLabel, type SponsorTarget } from '../sponsoringCore'

/**
 * Au plus 2 fiches sponsorisées en tête d’une liste, à part du classement et toujours marquées « Sponsorisé ».
 * Aucune sponsorisation en cours → rien n’est rendu. N’affiche ni ne modifie aucun statut de vérification (règle 4).
 * Libellé dans la langue de la page : `lang` s’il est donné, sinon les trois libellés et la feuille de style
 * n’affiche que celui de `<html lang>` (page statique, sans script).
 */
function Label({ lang }: { lang?: 'fr' | 'en' | 'ar' }) {
  if (lang) return <span className="chip chip-plain">{sponsoredLabel(lang)}</span>
  return (
    <span className="chip chip-plain">
      {(['fr', 'en', 'ar'] as const).map((l) => (
        <span key={l} lang={l} data-lang-only={l}>{SPONSORED_LABEL[l]}</span>
      ))}
    </span>
  )
}

export async function SponsoredList({ collection, wilaya, where, lang }: { collection: SponsorTarget; wilaya?: string | number | null; where?: Where; lang?: 'fr' | 'en' | 'ar' }) {
  const items = await sponsoredItems(collection, { wilaya, where })
  if (!items.length) return null
  const label = lang ? sponsoredLabel(lang) : `${SPONSORED_LABEL.fr} · ${SPONSORED_LABEL.en} · ${SPONSORED_LABEL.ar}`
  return (
    <ul className="sr-list sponsored-list" aria-label={label} data-sponsored="true">
      {items.map((it) => (
        <li key={`${it.collection}:${it.id}`}>
          <Link href={it.url} className="sr-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto' }}>
            <span className="sr-text">
              <b>{it.title}</b>
              {it.subtitle && <small>{it.subtitle}</small>}
            </span>
            <Label lang={lang} />
            <span className="sr-chev" aria-hidden="true">›</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
