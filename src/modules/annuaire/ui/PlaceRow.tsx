import Link from 'next/link'
import { SaveButton } from '@/modules/membres/ui'

export type PlaceRowData = { slug: string; name: string; photo: string; category: string; city: string; status: string; sectorTitle?: string | null }

export const PLACE_STATUS: Record<string, string> = { spotted: 'À vérifier', checking: 'En vérification', verified: 'Vérifiée', labelled: 'Label Excellence' }

/** Carte unique d’une adresse (modèle des pages de catégorie) : vignette, catégorie · ville, nom, rubrique · statut, favori. */
export function PlaceRow({ p, distance }: { p: PlaceRowData; distance?: string | null }) {
  return (
    <article className="place-row">
      <div className="place-thumb" style={{ backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <Link className="place-main" href={`/adresses/${p.slug}`}>
        <span className="place-type">
          {p.category} · {p.city}
          {distance ? ` · ${distance}` : ''}
        </span>
        <h3>{p.name}</h3>
        <p>
          {p.sectorTitle ? `${p.sectorTitle} · ` : ''}
          <b className={`status-${p.status}`}>{PLACE_STATUS[p.status] ?? PLACE_STATUS.spotted}</b>
        </p>
      </Link>
      <SaveButton itemType="listing" itemKey={p.slug} label={p.name} />
    </article>
  )
}

/** Liste de cartes hors annuaire (villes, accueil…) : même carte, en panneau ; deux colonnes sur ordinateur. */
export function PlacePanel({ places, more }: { places: PlaceRowData[]; more?: { href: string; label: string } }) {
  return (
    <div className="place-panel" data-reveal>
      <div className="place-panel-list">
        {places.map((p) => (
          <PlaceRow key={p.slug} p={p} />
        ))}
      </div>
      {more && (
        <Link className="place-panel-more" href={more.href}>
          {more.label} ›
        </Link>
      )}
    </div>
  )
}
