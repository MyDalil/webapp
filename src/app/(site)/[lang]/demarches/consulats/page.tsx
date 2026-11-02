import type { Metadata } from 'next'
import { listRepresentations } from '@/modules/contenus'
import { ConsulatFinder, type Rep } from '@/modules/contenus/ui'
import { XpHero } from '@/platform/ui/Xp'
import { PHOTOS } from '@/platform/referentiel/photos'

export const metadata: Metadata = { title: 'Ambassades et consulats d’Algérie dans le monde', description: 'Adresse, téléphone, email, site officiel, territoire couvert et services en ligne de chaque ambassade et consulat d’Algérie.' }
export const revalidate = 3600

/** Tous les postes diplomatiques et consulaires d’Algérie, groupés par pays, avec recherche. */
export default async function Consulats() {
  const reps = (await listRepresentations()).map(
    (r): Rep => ({ slug: r.slug, name: r.name, country: r.country, city: r.city, kind: r.kind, continent: r.continent, address: r.address, phone: r.phone, email: r.email, website: r.website, jurisdiction: r.jurisdiction, onlineServices: r.onlineServices?.map((s) => ({ title: s.title, url: s.url })) ?? [] }),
  )
  const photo = PHOTOS.ambassade
  return (
    <div className="xp">
      <XpHero compact photo={photo.src} credit={photo.credit} eyebrow="Algériens à l’étranger" title="Ambassades et consulats" lead="Trouvez le poste qui couvre votre ville : adresse, contacts, site officiel et services en ligne." back={{ href: '/demarches', label: 'Toutes les démarches' }} />
      <div className="container xp-body">
        {reps.length ? <ConsulatFinder reps={reps} /> : <p className="sr-note">La liste des postes arrive.</p>}
        <p className="sr-note">Coordonnées relevées sur les sites officiels, avec leur date. Une information a changé ? Écrivez-nous depuis la page Contribuer.</p>
      </div>
    </div>
  )
}
