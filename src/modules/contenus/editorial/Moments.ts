import type { Access, CollectionConfig } from 'payload'
import { isStaff, isStaffUser } from '@/platform/access'
import { countryField } from './country'
import { LANG_OPTIONS } from './lang'
import { clearTagAfterChange, clearTagAfterDelete } from './refresh'

const publishedOrStaff: Access = ({ req: { user } }) => (isStaffUser(user) ? true : { published: { equals: true } })

/** Pages saisonnières (Ramadan, rentrée, été…) : visibles entre `startsAt` et `endsAt`. Lecture publique des publiées. */
export const Moments: CollectionConfig = {
  slug: 'moments',
  labels: { singular: 'Moment de l’année', plural: 'Moments de l’année' },
  admin: { group: 'Contenus', useAsTitle: 'title', defaultColumns: ['title', 'slug', 'lang', 'startsAt', 'endsAt', 'published'] },
  defaultSort: '-startsAt',
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true },
    {
      type: 'row',
      fields: [
        { name: 'slug', type: 'text', label: 'Identifiant', required: true, index: true },
        { name: 'lang', type: 'select', label: 'Langue', required: true, defaultValue: 'fr', options: LANG_OPTIONS },
      ],
    },
    { name: 'summary', type: 'textarea', label: 'Résumé' },
    { name: 'body', type: 'richText', label: 'Texte' },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', label: 'Début' },
        { name: 'endsAt', type: 'date', label: 'Fin' },
      ],
    },
    {
      name: 'links',
      type: 'array',
      label: 'Liens',
      fields: [
        { name: 'label', type: 'text', label: 'Libellé', required: true },
        { name: 'url', type: 'text', label: 'Adresse', required: true },
      ],
    },
    { name: 'published', type: 'checkbox', label: 'Publié', defaultValue: false, index: true, admin: { position: 'sidebar' } },
    countryField(),
  ],
  hooks: { afterChange: [clearTagAfterChange('moments')], afterDelete: [clearTagAfterDelete('moments')] },
}
