import type { Access, CollectionConfig } from 'payload'
import { isStaff, isStaffUser } from '@/platform/access'
import { THEMES } from './themes'
import { linksField, listField, sourcesField, statusField } from './fields'
import { indexProcedure, unindexProcedure } from './search'

const publicOrStaff: Access = ({ req: { user } }) => (isStaffUser(user) ? true : { status: { equals: 'published' } })

/** Démarche officielle : à quoi elle sert, pour qui, lien direct vers le service en ligne, pièces, coût, délai, sources. */
export const Procedures: CollectionConfig = {
  slug: 'procedures',
  labels: { singular: 'Démarche officielle', plural: 'Démarches officielles' },
  admin: { group: 'Contenus', useAsTitle: 'title', defaultColumns: ['title', 'theme', 'online', 'status', 'updatedAt'], description: 'Garde-fous : src/rubriques/demarches/<thème>/AGENTS.md. Sources officielles seulement.' },
  defaultSort: 'title',
  access: { read: publicOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { afterChange: [indexProcedure], afterDelete: [unindexProcedure] },
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true },
    { name: 'slug', type: 'text', label: 'Adresse (/demarches/…)', required: true, unique: true, index: true },
    { name: 'theme', type: 'select', label: 'Thème', required: true, index: true, options: THEMES.map((t) => ({ label: t.label, value: t.key })) },
    {
      name: 'audience',
      type: 'select',
      label: 'Pour qui',
      hasMany: true,
      options: [
        { label: 'Résidents en Algérie', value: 'residents' },
        { label: 'Algériens à l’étranger', value: 'diaspora' },
        { label: 'Étrangers', value: 'etrangers' },
        { label: 'Entreprises', value: 'entreprises' },
      ],
    },
    { name: 'summary', type: 'textarea', label: 'À quoi elle sert (1 à 2 phrases)', required: true },
    {
      type: 'row',
      fields: [
        { name: 'online', type: 'checkbox', label: 'Faisable en ligne', defaultValue: false },
        { name: 'onlineUrl', type: 'text', label: 'Lien du service en ligne officiel' },
        { name: 'platform', type: 'text', label: 'Nom du site officiel' },
      ],
    },
    listField('steps', 'Étapes'),
    listField('documents', 'Pièces à fournir'),
    { type: 'row', fields: [{ name: 'cost', type: 'text', label: 'Coût' }, { name: 'delay', type: 'text', label: 'Délai' }] },
    { name: 'where', type: 'text', label: 'Où s’adresser' },
    linksField('forms', 'Formulaires officiels (PDF)'),
    linksField('laws', 'Textes de loi (JORADP)'),
    sourcesField,
    statusField,
  ],
}
