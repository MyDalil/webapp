import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isStaff } from '@/lib/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'
import { slugField } from '@/fields'

const hooks = { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] }

export const Sectors: CollectionConfig = {
  slug: 'sectors',
  labels: { singular: 'Secteur', plural: 'Secteurs' },
  admin: { useAsTitle: 'title', defaultColumns: ['order', 'title', 'slug'], group: 'Annuaire' },
  defaultSort: 'order',
  access: { read: anyone, create: isAdmin, update: isStaff, delete: isAdmin },
  hooks,
  fields: [
    { name: 'title', type: 'text', label: 'Nom', required: true, localized: true },
    slugField('title'),
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 99, admin: { position: 'sidebar' } },
    { name: 'intro', type: 'textarea', label: 'Accroche', localized: true },
    { name: 'icon', type: 'text', label: 'Icône (nom Lucide)', admin: { position: 'sidebar' } },
    {
      name: 'criteria',
      type: 'array',
      label: 'Informations vérifiées pour ce secteur',
      fields: [{ name: 'label', type: 'text', localized: true }],
    },
    { name: 'guide', type: 'relationship', relationTo: 'guides', label: 'Guide associé' },
    { name: 'specialties', type: 'join', collection: 'specialties', on: 'sector', label: 'Spécialités' },
  ],
}

export const Specialties: CollectionConfig = {
  slug: 'specialties',
  labels: { singular: 'Spécialité', plural: 'Spécialités' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'sector', 'order'], group: 'Annuaire' },
  defaultSort: 'order',
  access: { read: anyone, create: isStaff, update: isStaff, delete: isAdmin },
  hooks,
  fields: [
    { name: 'title', type: 'text', label: 'Nom', required: true, localized: true },
    slugField('title'),
    { name: 'sector', type: 'relationship', relationTo: 'sectors', required: true, label: 'Secteur', index: true },
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 99, admin: { position: 'sidebar' } },
  ],
}

export const Wilayas: CollectionConfig = {
  slug: 'wilayas',
  labels: { singular: 'Wilaya', plural: 'Wilayas' },
  admin: { useAsTitle: 'name', defaultColumns: ['code', 'name', 'featured'], group: 'Annuaire' },
  defaultSort: 'code',
  access: { read: anyone, create: isAdmin, update: isStaff, delete: isAdmin },
  hooks,
  fields: [
    { name: 'code', type: 'number', label: 'Code', required: true, unique: true },
    { name: 'name', type: 'text', label: 'Nom', required: true, localized: true },
    slugField('name'),
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Wilaya prioritaire',
      defaultValue: false,
      admin: { description: 'Affichée en premier. Les autres restent dans le menu déroulant.' },
    },
  ],
}
