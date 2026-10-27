import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '@/platform/access'
import { refreshPages } from './refresh'

/** Pack d’accompagnement payant, un par démarche. Prix saisis dans /admin, jamais inventés. */
export const Packs: CollectionConfig = {
  slug: 'packs',
  labels: { singular: 'Pack d’accompagnement', plural: 'Packs d’accompagnement' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'guide', 'priceEur', 'active'], group: 'Accompagnement' },
  defaultSort: 'order',
  hooks: { afterChange: [() => refreshPages()], afterDelete: [() => refreshPages()] },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', label: 'Nom du pack', required: true },
    { name: 'slug', type: 'text', label: 'Adresse (/accompagnement/…)', required: true, unique: true, index: true },
    { name: 'demarche', type: 'text', label: 'Démarche', required: true, admin: { description: 'Ex. : Certificat de changement de résidence (CCR).' } },
    { name: 'guide', type: 'text', label: 'Guide gratuit lié', required: true, index: true, admin: { description: 'Chemin de la page du guide gratuit, ex. /demarches/ccr ou /guides/logement.' } },
    { name: 'summary', type: 'textarea', label: 'Résumé', required: true },
    { name: 'includes', type: 'array', label: 'Ce qui est inclus', minRows: 1, fields: [{ name: 'item', type: 'text', label: 'Élément', required: true }] },
    {
      type: 'row',
      fields: [
        { name: 'priceEur', type: 'number', label: 'Prix (€)', min: 0, admin: { description: 'Vide : « Tarif annoncé au lancement ».' } },
        { name: 'priceDa', type: 'number', label: 'Prix (DA)', min: 0, admin: { description: 'Vide : « Équivalent en dinars annoncé au lancement ».' } },
      ],
    },
    { name: 'perPerson', type: 'checkbox', label: 'Prix par personne', defaultValue: false, admin: { description: 'Coché : le demandeur choisit le nombre de personnes et le total se calcule.' } },
    { name: 'active', type: 'checkbox', label: 'Proposé', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
