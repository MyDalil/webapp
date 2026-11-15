import Link from '@/platform/ui/Link'
import { Icon } from '@/platform/ui/Icon'
import { categoryPath } from '@/platform/referentiel/slug'

/** Pictogramme d’une sous-catégorie ; sans entrée ici, celui de la rubrique. */
const ICON: Record<string, string> = {
  Crèches: 'baby', 'Écoles primaires': 'book', Collèges: 'books', Lycées: 'school', Universités: 'building', 'Formation professionnelle': 'wrench',
  'Écoles de langues': 'globe', 'Auto-écoles': 'car', 'Écoles coraniques': 'mosque', Médecins: 'health', Pharmacies: 'drop', Hôpitaux: 'building',
  Vétérinaires: 'paw', Restaurants: 'utensils', Cafés: 'cup', 'Salons de thé': 'cup', Hôtels: 'home', 'Salles de sport': 'dumbbell', Mosquées: 'mosque',
  'Bureaux de poste': 'mail', Ambassades: 'globe', Consulats: 'passport', Banques: 'cash', Librairies: 'books', Habillement: 'shirt', Plages: 'sun',
  Parcs: 'leaf', Jardins: 'leaf', 'Services automobiles': 'car', 'Location de véhicules': 'key', Déménagement: 'truck', Artisans: 'wrench',
}
const SECTOR_ICON: Record<string, string> = {
  'education-formation': 'school', 'sante-soins': 'health', 'restaurants-gastronomie': 'utensils', 'administrations-services-publics': 'building',
  'mosquees-priere': 'mosque', 'transports-mobilite': 'car', 'commerces-achats': 'tag', 'hebergement-sejours': 'home', 'logement-immobilier': 'key',
  'bien-etre-sport': 'heart', 'culture-nature-loisirs': 'pin', 'maison-travaux': 'wrench', 'droit-finance-conseil': 'briefcase',
}
const TONES = ['#16a34a', '#2563eb', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#dc2626', '#0d9488', '#4f46e5']
/** Le reste non classé d’une rubrique se lit « Autres … » à côté des niveaux précis. */
const LABEL: Record<string, string> = { Écoles: 'Autres écoles' }
/** Une catégorie rangée dans une autre rubrique mais attendue ici aussi (décision de Rad, 2026-11-15). */
const ALSO: Record<string, [sector: string, category: string][]> = { 'education-formation': [['mosquees-priere', 'Écoles coraniques']] }
const CITIES: [code: number, name: string][] = [[16, 'Alger'], [31, 'Oran'], [25, 'Constantine']]

/**
 * En-tête de navigation d’une rubrique de l’annuaire : trois villes en raccourci, puis les sous-catégories en cases
 * (pictogramme en couleur + nom). Remplace le nombre brut d’adresses et la liste de toutes les wilayas.
 */
export function CategoryTiles({ sector, categories, active, wilaya }: { sector: string; categories: string[]; active?: string; wilaya?: number | null }) {
  const tiles: [sector: string, category: string][] = [...categories.map((c): [string, string] => [sector, c]), ...(ALSO[sector] ?? [])]
  return (
    <div className="cat-nav">
      <nav className="cat-cities" aria-label="Villes">
        {CITIES.map(([code, name]) => (
          <Link key={code} className={`chip ${wilaya === code ? '' : 'chip-plain'}`} href={active ? categoryPath(sector, active, code) : `/annuaire/${sector}?wilaya=${code}`}>
            {name}
          </Link>
        ))}
        {wilaya != null && (
          <Link className="chip chip-plain" href={active ? categoryPath(sector, active) : `/annuaire/${sector}`}>
            Toute l’Algérie
          </Link>
        )}
      </nav>
      <nav className="cat-tiles" aria-label="Catégories">
        {tiles.map(([s, c], i) => (
          <Link key={`${s}-${c}`} className="cat-tile" href={categoryPath(s, c, s === sector ? wilaya : null)} aria-current={s === sector && c === active ? 'page' : undefined} style={{ ['--rc' as string]: TONES[i % TONES.length] }}>
            <span className="cat-tile-ico" aria-hidden="true">
              <Icon name={ICON[c] ?? SECTOR_ICON[s] ?? 'pin'} />
            </span>
            <span>{LABEL[c] ?? c}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
