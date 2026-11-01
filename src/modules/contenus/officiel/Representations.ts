import type { Access, CollectionConfig } from 'payload'
import { isStaff, isStaffUser } from '@/platform/access'
import { linksField, sourcesField, statusField } from './fields'
import { indexRepresentation, unindexRepresentation } from './search'

const publicOrStaff: Access = ({ req: { user } }) => (isStaffUser(user) ? true : { status: { equals: 'published' } })

/** Ambassade ou consulat d’Algérie dans le monde : coordonnées datées, juridiction, services en ligne. */
export const Representations: CollectionConfig = {
  slug: 'representations',
  labels: { singular: 'Ambassade ou consulat', plural: 'Ambassades et consulats' },
  admin: { group: 'Contenus', useAsTitle: 'name', defaultColumns: ['name', 'country', 'city', 'kind', 'status'], description: 'Garde-fous : src/rubriques/demarches/consulats/AGENTS.md.' },
  defaultSort: 'country',
  access: { read: publicOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { afterChange: [indexRepresentation], afterDelete: [unindexRepresentation] },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true },
    { name: 'slug', type: 'text', label: 'Identifiant', required: true, unique: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'country', type: 'text', label: 'Pays', required: true, index: true },
        { name: 'city', type: 'text', label: 'Ville', required: true },
        {
          name: 'kind',
          type: 'select',
          label: 'Type',
          required: true,
          options: [
            { label: 'Ambassade', value: 'ambassade' },
            { label: 'Consulat général', value: 'consulat-general' },
            { label: 'Consulat', value: 'consulat' },
          ],
        },
      ],
    },
    { name: 'continent', type: 'select', label: 'Continent', options: ['Europe', 'Afrique', 'Amérique du Nord', 'Amérique latine', 'Moyen-Orient', 'Asie', 'Océanie'].map((c) => ({ label: c, value: c })) },
    { name: 'address', type: 'textarea', label: 'Adresse' },
    { type: 'row', fields: [{ name: 'phone', type: 'text', label: 'Téléphone' }, { name: 'email', type: 'text', label: 'Email' }, { name: 'website', type: 'text', label: 'Site officiel' }] },
    { name: 'jurisdiction', type: 'textarea', label: 'Juridiction (territoire couvert)' },
    linksField('onlineServices', 'Services en ligne'),
    sourcesField,
    statusField,
  ],
}
