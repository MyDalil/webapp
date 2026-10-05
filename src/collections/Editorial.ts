import type { ArrayField, CollectionConfig } from 'payload'
import { isAdmin, isStaff, publishedOrStaff } from '@/lib/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'
import { searchField, slugField, sourcesField } from '@/fields'

const hooks = { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] }
const versions = { drafts: { autosave: false, schedulePublish: true }, maxPerDoc: 25 }

export const GUIDE_THEMES = [
  { label: 'S’installer', value: 'installation' },
  { label: 'Démarches & papiers', value: 'demarches' },
  { label: 'Vie quotidienne', value: 'quotidien' },
  { label: 'Découvrir & sortir', value: 'decouvrir' },
  { label: 'Business & emploi', value: 'business' },
] as const

export const Guides: CollectionConfig = {
  slug: 'guides',
  labels: { singular: 'Guide', plural: 'Guides' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'theme', '_status', 'updatedAt'], group: 'Contenus' },
  defaultSort: 'order',
  versions,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks,
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true, localized: true },
    { name: 'summary', type: 'textarea', label: 'Chapeau', localized: true },
    {
      name: 'checklist',
      type: 'array',
      label: 'Étapes à suivre',
      labels: { singular: 'Étape', plural: 'Étapes' },
      fields: [{ name: 'text', type: 'textarea', localized: true, label: 'Étape' }],
    },
    { name: 'body', type: 'richText', label: 'Contenu détaillé', localized: true },
    sourcesField,
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Image', admin: { position: 'sidebar' } },
    slugField('title'),
    {
      name: 'theme',
      type: 'select',
      label: 'Rubrique',
      required: true,
      options: [...GUIDE_THEMES],
      admin: { position: 'sidebar' },
      index: true,
    },
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 99, admin: { position: 'sidebar' } },
    { name: 'reviewedAt', type: 'date', label: 'Dernière relecture', admin: { position: 'sidebar' } },
    searchField(['title', 'summary', 'body']),
  ],
}

export const ARTICLE_CATEGORIES = [
  { label: 'Vie pratique', value: 'vie-pratique' },
  { label: 'Société', value: 'societe' },
  { label: 'Économie', value: 'economie' },
  { label: 'Culture', value: 'culture' },
  { label: 'Réglementation', value: 'reglementation' },
] as const

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Actualité', plural: 'Actualités' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'category', 'publishedAt', '_status'], group: 'Contenus' },
  defaultSort: '-publishedAt',
  versions,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks,
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true, localized: true },
    { name: 'summary', type: 'textarea', label: 'Chapeau', localized: true },
    { name: 'body', type: 'richText', label: 'Article', localized: true },
    { ...(sourcesField as ArrayField), minRows: 1 } as ArrayField,
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Image', admin: { position: 'sidebar' } },
    slugField('title'),
    {
      name: 'category',
      type: 'select',
      label: 'Catégorie',
      required: true,
      options: [...ARTICLE_CATEGORIES],
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Date de publication',
      admin: { position: 'sidebar' },
      hooks: { beforeChange: [({ value, siblingData }) => value ?? (siblingData._status === 'published' ? new Date() : value)] },
    },
    searchField(['title', 'summary', 'body']),
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages (légal, label…)' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status'], group: 'Contenus' },
  versions,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks,
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true, localized: true },
    { name: 'intro', type: 'textarea', label: 'Introduction', localized: true },
    { name: 'body', type: 'richText', label: 'Contenu', localized: true },
    slugField('title'),
  ],
}
