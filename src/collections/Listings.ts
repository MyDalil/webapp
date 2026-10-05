import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField, isStaff, publishedOrStaff } from '@/lib/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'
import { searchField, slugField, sourcesField } from '@/fields'

export const Listings: CollectionConfig = {
  slug: 'listings',
  labels: { singular: 'Fiche', plural: 'Fiches annuaire' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sector', 'wilaya', 'verification', '_status', 'updatedAt'],
    group: 'Annuaire',
    listSearchableFields: ['name', 'commune'],
  },
  versions: { drafts: { autosave: false, schedulePublish: true }, maxPerDoc: 25 },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identité',
          fields: [
            { name: 'name', type: 'text', label: 'Nom de l’établissement', required: true, localized: true },
            { name: 'summary', type: 'textarea', label: 'Résumé (1–2 phrases)', localized: true, maxLength: 280 },
            { name: 'description', type: 'richText', label: 'Présentation', localized: true },
            {
              type: 'row',
              fields: [
                { name: 'sector', type: 'relationship', relationTo: 'sectors', required: true, label: 'Secteur', index: true },
                {
                  name: 'specialties',
                  type: 'relationship',
                  relationTo: 'specialties',
                  hasMany: true,
                  label: 'Spécialités',
                  filterOptions: ({ siblingData }) => {
                    const s = (siblingData as { sector?: number | { id: number } })?.sector
                    const id = typeof s === 'object' ? s?.id : s
                    return id ? { sector: { equals: id } } : true
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Adresse & contact',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'wilaya', type: 'relationship', relationTo: 'wilayas', label: 'Wilaya', index: true },
                { name: 'commune', type: 'text', label: 'Commune / quartier' },
              ],
            },
            { name: 'address', type: 'text', label: 'Adresse', localized: true },
            {
              type: 'row',
              fields: [
                { name: 'lat', type: 'number', label: 'Latitude' },
                { name: 'lng', type: 'number', label: 'Longitude' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'phone', type: 'text', label: 'Téléphone' },
                { name: 'whatsapp', type: 'text', label: 'WhatsApp' },
                { name: 'email', type: 'email', label: 'Email' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'website', type: 'text', label: 'Site web' },
                { name: 'instagram', type: 'text', label: 'Instagram' },
                { name: 'facebook', type: 'text', label: 'Facebook' },
              ],
            },
            { name: 'hours', type: 'textarea', label: 'Horaires', localized: true },
            { name: 'languages', type: 'text', label: 'Langues parlées', localized: true },
            { name: 'accessibility', type: 'textarea', label: 'Accessibilité', localized: true },
          ],
        },
        {
          label: 'Images',
          fields: [
            { name: 'cover', type: 'upload', relationTo: 'media', label: 'Image principale' },
            { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true, label: 'Galerie' },
          ],
        },
        {
          label: 'Vérification',
          fields: [
            {
              name: 'verification',
              type: 'select',
              label: 'Statut de vérification',
              defaultValue: 'unverified',
              required: true,
              options: [
                { label: 'Non vérifiée', value: 'unverified' },
                { label: 'Informations vérifiées', value: 'verified' },
                { label: 'Professionnel identifié', value: 'claimed' },
              ],
            },
            { name: 'verifiedAt', type: 'date', label: 'Date de vérification' },
            sourcesField,
            {
              name: 'label',
              type: 'checkbox',
              label: 'Label DALIL Excellence',
              defaultValue: false,
              access: { update: isAdminField, create: isAdminField },
              admin: { description: 'Décision distincte, motivée et datée. Ne s’achète pas.' },
            },
            { name: 'labelNote', type: 'textarea', label: 'Motivation du label', access: { update: isAdminField } },
          ],
        },
      ],
    },
    slugField('name'),
    { name: 'featured', type: 'checkbox', label: 'Mise en avant', defaultValue: false, admin: { position: 'sidebar' } },
    searchField(['name', 'summary', 'commune', 'address', 'description']),
  ],
}
