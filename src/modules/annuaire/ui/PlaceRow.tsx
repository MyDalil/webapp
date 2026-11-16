import Link from '@/platform/ui/Link'
import { Visual } from '@/platform/ui/Visual'
import { categoryPhoto } from '../listings'
import { SaveButton } from '@/modules/membres/ui'
import { Icon } from '@/platform/ui/Icon'

export type PlaceRowData = { slug: string; name: string; photo: string; category: string; city: string; status: string; sectorTitle?: string | null; sector?: string | null }

/** Sans photo du lieu : pictogramme du secteur sur sa couleur de rubrique (jamais une vignette grise). */
const SECTOR_VISUAL: Record<string, [string, string]> = {
  'mosquees-priere': ['mosque', '#006b3c'],
  'sante-soins': ['health', '#1a56db'],
  'maison-travaux': ['briefcase', '#1a56db'],
  'droit-finance-conseil': ['cash', '#1a56db'],
  'transports-mobilite': ['car', '#1a56db'],
  'bien-etre-sport': ['heart', '#1a56db'],
  'culture-nature-loisirs': ['pin', '#c2410c'],
  'restaurants-gastronomie': ['pin', '#c2410c'],
  'hebergement-sejours': ['home', '#c2410c'],
  'administrations-services-publics': ['building', '#6d28d9'],
  'education-formation': ['school', '#6d28d9'],
  'logement-immobilier': ['home', '#be185d'],
  'commerces-achats': ['grid', '#be185d'],
}
export const placeholderOf = (photo: string) => !photo || photo.includes('/images/lieu')

export const PLACE_STATUS: Record<string, string> = { spotted: 'À vérifier', checking: 'En vérification', verified: 'Vérifiée', labelled: 'Label Excellence' }

/** Carte unique d’une adresse (modèle des pages de catégorie) : vignette, catégorie · ville, nom, rubrique · statut, favori. */
export function PlaceRow({ p, distance }: { p: PlaceRowData; distance?: string | null }) {
  return (
    <article className="place-row">
      {placeholderOf(p.photo) ? (
        <div className="place-thumb is-icon" style={{ ['--c' as string]: (SECTOR_VISUAL[p.sector ?? ''] ?? ['pin', '#006b3c'])[1] }} aria-hidden="true">
          <Icon name={(SECTOR_VISUAL[p.sector ?? ''] ?? ['pin'])[0]} />
        </div>
      ) : (
        <div className="place-thumb" style={{ backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}
      <Link className="place-main" href={`/adresses/${p.slug}`}>
        <span className="place-type">
          {p.category} · {p.city}
          {distance ? ` · ${distance}` : ''}
        </span>
        <h3>{p.name}</h3>
        <p hidden={!p.sectorTitle && p.status !== 'verified' && p.status !== 'labelled'}>
          {p.sectorTitle}
          {/* Statut public : seulement une vérification acquise. « À vérifier » reste interne (/admin). */}
          {(p.status === 'verified' || p.status === 'labelled') && (
            <>
              {p.sectorTitle ? ' · ' : ''}
              <b className={`status-${p.status}`}>{PLACE_STATUS[p.status]}</b>
            </>
          )}
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

/**
 * Adresses en cartes photo (guides, rubriques) : même carte que les guides voisins ; carrousel sur mobile.
 * Sans photo du lieu, la photo de sa catégorie ; à défaut, le pictogramme de la rubrique. Jamais de case vide.
 */
export function PlaceCards({ places }: { places: PlaceRowData[] }) {
  return (
    <ul className="dm-cards place-cards swipe">
      {places.map((p) => {
        const src = placeholderOf(p.photo) ? categoryPhoto(p.category)?.src : p.photo
        const [icon] = SECTOR_VISUAL[p.sector ?? ''] ?? ['pin']
        return (
          <li key={p.slug} className="dm-card">
            <Link href={`/adresses/${p.slug}`} className="dm-card-main">
              <span className="dm-card-media">
                <Visual src={src ?? undefined} icon={icon} tone="vert" />
                <span className="place-badge" aria-hidden="true">
                  <Icon name={icon} />
                </span>
              </span>
              <span className="dm-card-text">
                <b>{p.name}</b>
                <small>
                  {p.category} · {p.city}
                </small>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
