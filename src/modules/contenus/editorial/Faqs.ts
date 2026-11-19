import type { Access, CollectionConfig } from 'payload'
import { isStaff, isStaffUser } from '@/platform/access'
import { countryField } from './country'
import { LANG_OPTIONS } from './lang'
import { clearTagAfterChange, clearTagAfterDelete } from './refresh'

const publishedOrStaff: Access = ({ req: { user } }) => (isStaffUser(user) ? true : { published: { equals: true } })

/** Questions fréquentes rattachées à une page (`scope` = chemin, ex. /annuaire/sante/pediatres). Lecture publique des publiées. */
export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: { singular: 'Question fréquente', plural: 'Questions fréquentes' },
  admin: { group: 'Contenus', useAsTitle: 'question', defaultColumns: ['question', 'scope', 'lang', 'order', 'published'] },
  defaultSort: 'order',
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'scope', type: 'text', label: 'Page', required: true, index: true, admin: { description: 'Chemin de la page, ex. /annuaire/sante/pediatres' } },
        { name: 'lang', type: 'select', label: 'Langue', required: true, defaultValue: 'fr', options: LANG_OPTIONS },
      ],
    },
    { name: 'question', type: 'text', label: 'Question', required: true },
    { name: 'answer', type: 'textarea', label: 'Réponse', required: true },
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'published', type: 'checkbox', label: 'Publiée', defaultValue: false, index: true, admin: { position: 'sidebar' } },
    countryField(),
  ],
  hooks: { afterChange: [clearTagAfterChange('faqs')], afterDelete: [clearTagAfterDelete('faqs')] },
}
