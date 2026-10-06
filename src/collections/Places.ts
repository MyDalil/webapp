import type { CollectionAfterChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { isAdmin, isStaff, publishedOrStaff } from '@/lib/access'
import { SECTORS, WILAYAS } from '@/content/catalog'

export const PLACE_STATUS = [
  { label: 'Repérée — à vérifier', value: 'spotted' },
  { label: 'En cours de vérification', value: 'checking' },
  { label: 'Vérifiée par DALIL', value: 'verified' },
  { label: 'Labellisée Excellence', value: 'labelled' },
] as const

export const CRITERION_RESULTS = [
  { label: 'À confirmer', value: 'pending' },
  { label: 'Conforme', value: 'ok' },
  { label: 'Partiel', value: 'partial' },
  { label: 'Non conforme', value: 'ko' },
  { label: 'Non concerné', value: 'na' },
] as const

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Slug automatique + critères du secteur pré-remplis à la première saisie. */
const prepare: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  if (!data.slug && data.name) data.slug = slugify(`${data.name} ${data.city ?? ''}`)
  if (data.sector && (!data.criteria || data.criteria.length === 0)) {
    const sector = SECTORS.find((s) => s.slug === data.sector)
    if (sector) data.criteria = sector.criteria.map((criterion) => ({ criterion, result: 'pending' }))
  }
  return data
}

/** Le site public se met à jour dès qu’une fiche est enregistrée, sans redéploiement. */
const refresh: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (req.context?.skipRevalidate) return doc
  try {
    revalidatePath('/annuaire')
    revalidatePath(`/annuaire/${doc.sector}`)
    revalidatePath(`/adresses/${doc.slug}`)
    if (previousDoc?.slug && previousDoc.slug !== doc.slug) revalidatePath(`/adresses/${previousDoc.slug}`)
  } catch {
    // hors contexte Next (migrations, scripts) : rien à rafraîchir
  }
  return doc
}

export const Places: CollectionConfig = {
  slug: 'places',
  labels: { singular: 'Adresse', plural: 'Adresses' },
  admin: {
    group: 'Annuaire',
    useAsTitle: 'name',
    defaultColumns: ['name', 'sector', 'city', 'verification', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'city', 'category', 'address'],
    preview: (doc) => `/api/preview?slug=${doc.slug}`,
  },
  versions: { drafts: true },
  defaultSort: 'name',
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks: { beforeValidate: [prepare], afterChange: [refresh] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Fiche',
          fields: [
            { name: 'name', type: 'text', label: 'Nom', required: true },
            {
              type: 'row',
              fields: [
                {
                  name: 'sector',
                  type: 'select',
                  label: 'Secteur',
                  required: true,
                  options: SECTORS.map((s) => ({ label: s.title, value: s.slug })),
                },
                {
                  name: 'category',
                  type: 'text',
                  label: 'Catégorie',
                  required: true,
                  admin: { description: 'Ex. Restaurants, Cafés, Écoles, Cliniques…' },
                },
              ],
            },
            { name: 'intro', type: 'textarea', label: 'Présentation', admin: { description: 'Deux ou trois phrases factuelles.' } },
            { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, label: 'Photos', admin: { description: 'La première sert de couverture.' } },
          ],
        },
        {
          label: 'Localisation',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'wilaya',
                  type: 'select',
                  label: 'Wilaya',
                  options: WILAYAS.map((w) => ({ label: `${String(w.code).padStart(2, '0')} — ${w.name}`, value: String(w.code) })),
                },
                { name: 'city', type: 'text', label: 'Ville', required: true },
              ],
            },
            { name: 'place', type: 'text', label: 'Quartier / repère', admin: { description: 'Affiché sous la photo. Ex. Saïd Hamdine, Alger.' } },
            { name: 'address', type: 'text', label: 'Adresse complète' },
            {
              type: 'row',
              fields: [
                { name: 'lat', type: 'number', label: 'Latitude', min: 18, max: 38, admin: { step: 0.000001 } },
                { name: 'lng', type: 'number', label: 'Longitude', min: -9, max: 12, admin: { step: 0.000001 } },
              ],
            },
            {
              type: 'ui',
              name: 'coordsHelp',
              admin: {
                components: { Field: '@/components/admin/CoordsHelp#CoordsHelp' },
              },
            },
          ],
        },
        {
          label: 'Contacts & horaires',
          fields: [
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
            {
              name: 'hours',
              type: 'array',
              label: 'Horaires',
              labels: { singular: 'Créneau', plural: 'Horaires' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'days', type: 'text', label: 'Jours', required: true, admin: { description: 'Ex. Samedi – jeudi' } },
                    { name: 'time', type: 'text', label: 'Heures', required: true, admin: { description: 'Ex. 12h – 23h, ou Fermé' } },
                  ],
                },
              ],
            },
            {
              name: 'showContacts',
              type: 'checkbox',
              label: 'Afficher les coordonnées à tous les visiteurs',
              defaultValue: false,
              admin: { description: 'Sinon, les coordonnées sont réservées aux visiteurs ayant un profil.' },
            },
          ],
        },
        {
          label: 'Vérification',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'verification', type: 'select', label: 'Statut DALIL', required: true, defaultValue: 'spotted', options: [...PLACE_STATUS] },
                { name: 'verifiedAt', type: 'date', label: 'Dernière vérification', admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' } } },
                { name: 'verifiedBy', type: 'text', label: 'Vérifiée par' },
              ],
            },
            {
              name: 'criteria',
              type: 'array',
              label: 'Critères DALIL',
              labels: { singular: 'Critère', plural: 'Critères' },
              admin: { description: 'Pré-remplis selon le secteur. Mettez à jour après chaque visite.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'criterion', type: 'text', label: 'Critère', required: true },
                    { name: 'result', type: 'select', label: 'Résultat', required: true, defaultValue: 'pending', options: [...CRITERION_RESULTS] },
                    { name: 'note', type: 'text', label: 'Précision' },
                  ],
                },
              ],
            },
            {
              name: 'sources',
              type: 'array',
              label: 'Sources',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', label: 'Libellé' },
                    { name: 'url', type: 'text', label: 'Lien', required: true },
                  ],
                },
              ],
            },
            { name: 'internalNote', type: 'textarea', label: 'Note interne (jamais publiée)' },
          ],
        },
      ],
    },
    { name: 'slug', type: 'text', label: 'Adresse de la page', unique: true, index: true, admin: { position: 'sidebar', description: 'Généré depuis le nom. /adresses/…' } },
  ],
}
