import type { CollectionConfig } from 'payload'
import { anyone, isStaff } from '@/platform/access'

/**
 * Traductions des champs de contenu (fr, en, ar), une ligne par (collection, document, champ, langue).
 * `sourceHash` : empreinte du texte source traduit ; si elle ne correspond plus, la traduction est périmée.
 * Lecture publique (le site affiche les traductions) ; écriture par l’équipe.
 */
export const Translations: CollectionConfig = {
  slug: 'translations',
  labels: { singular: 'Traduction', plural: 'Traductions' },
  admin: { group: 'Contenus', useAsTitle: 'field', defaultColumns: ['collection', 'docId', 'field', 'lang', 'status', 'updatedAt'] },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  indexes: [{ fields: ['collection', 'docId', 'field', 'lang'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'collection', type: 'text', label: 'Collection', required: true, index: true },
        { name: 'docId', type: 'text', label: 'Document', required: true, index: true },
        { name: 'field', type: 'text', label: 'Champ', required: true },
        { name: 'lang', type: 'select', label: 'Langue', required: true, options: [{ label: 'Français', value: 'fr' }, { label: 'English', value: 'en' }, { label: 'العربية', value: 'ar' }] },
      ],
    },
    { name: 'text', type: 'textarea', label: 'Texte traduit' },
    { name: 'sourceHash', type: 'text', label: 'Empreinte du texte source', admin: { readOnly: true } },
    { name: 'status', type: 'select', label: 'État', required: true, defaultValue: 'auto', options: [{ label: 'Automatique', value: 'auto' }, { label: 'Relue', value: 'relue' }], admin: { position: 'sidebar' } },
  ],
}
