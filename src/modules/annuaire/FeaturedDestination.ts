import type { GlobalConfig } from 'payload'
import { isStaff } from '@/platform/access'

/**
 * « Destination à l’honneur » : le grand bloc panoramique de l’accueil (une seule destination à la fois,
 * jamais de carrousel). L’équipe la change selon les régions et les saisons ; à défaut, le Sahara.
 */
export const FeaturedDestination: GlobalConfig = {
  slug: 'featured-destination',
  label: 'Destination à l’honneur',
  admin: { group: 'Annuaire', description: 'Bloc panoramique de l’accueil. Une destination à la fois, choisie par l’équipe.' },
  access: { read: () => true, update: isStaff },
  fields: [
    { name: 'place', type: 'relationship', relationTo: 'places', label: 'Lieu', admin: { description: 'Sa photo de couverture et son lien sont repris. Vide : le Sahara (Tassili n’Ajjer).' } },
    { name: 'eyebrow', type: 'text', label: 'Surtitre', defaultValue: 'Le grand Sud', maxLength: 40 },
    { name: 'title', type: 'text', label: 'Titre', defaultValue: 'Le Sahara, comme nulle part ailleurs.', maxLength: 80 },
    { name: 'text', type: 'textarea', label: 'Phrase courte', defaultValue: 'Canyons de grès, peintures rupestres millénaires et oasis : préparez votre voyage avec des repères fiables.', maxLength: 240 },
    { name: 'cta', type: 'text', label: 'Texte du bouton', admin: { description: 'Vide : « Découvrir » + nom du lieu.' }, maxLength: 40 },
  ],
}
