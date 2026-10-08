import type { CollectionAfterChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { isAdmin, isStaff, publishedOrStaff } from '@/platform/access'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { criteriaFor, verificationTab } from '@/modules/confiance'
import { scorePlace } from './ranking'

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Slug automatique + critères du secteur pré-remplis à la première saisie. */
const prepare: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  if (!data.slug && data.name) data.slug = slugify(`${data.name} ${data.city ?? ''}`)
  data.score = scorePlace({ ...(originalDoc ?? {}), ...data })
  if (data.sector && (!data.criteria || data.criteria.length === 0)) data.criteria = criteriaFor(data.sector)
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
            {
              name: 'externalPhotos',
              type: 'array',
              label: 'Photos sous licence libre',
              labels: { singular: 'Photo', plural: 'Photos sous licence libre' },
              admin: { description: 'Wikimedia Commons ou autre source libre : auteur et licence obligatoires, affichés sous la photo. Utilisées après les photos DALIL.' },
              fields: [
                { name: 'url', type: 'text', label: 'Image', required: true },
                {
                  type: 'row',
                  fields: [
                    { name: 'author', type: 'text', label: 'Auteur', required: true },
                    { name: 'license', type: 'text', label: 'Licence', required: true },
                    { name: 'licenseUrl', type: 'text', label: 'Lien de la licence' },
                  ],
                },
                { name: 'page', type: 'text', label: 'Page source', required: true },
                { type: 'row', fields: [{ name: 'width', type: 'number', label: 'Largeur' }, { name: 'height', type: 'number', label: 'Hauteur' }] },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'nameAr', type: 'text', label: 'Nom en arabe' },
                { name: 'nameEn', type: 'text', label: 'Nom en anglais' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'heritage', type: 'text', label: 'Protection patrimoniale', admin: { description: 'Ex. Patrimoine mondial de l’UNESCO, monument classé.' } },
                { name: 'inception', type: 'text', label: 'Date de création' },
                { name: 'wikipedia', type: 'text', label: 'Article Wikipédia' },
              ],
            },
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
                components: { Field: '@/modules/annuaire/admin/CoordsHelp#CoordsHelp' },
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
        verificationTab,
      ],
    },
    { name: 'score', type: 'number', label: 'Score de classement', index: true, admin: { position: 'sidebar', readOnly: true, description: 'Calculé à l’enregistrement (règle écrite dans le module annuaire). Jamais lié à un paiement.' } },
    {
      name: 'source',
      type: 'group',
      label: 'Origine de la fiche',
      admin: { position: 'sidebar' },
      fields: [
        { name: 'provider', type: 'select', label: 'Source', defaultValue: 'dalil', options: [{ label: 'Équipe DALIL', value: 'dalil' }, { label: 'Wikidata', value: 'wikidata' }, { label: 'OpenStreetMap', value: 'osm' }, { label: 'Établissement', value: 'pro' }] },
        { name: 'externalId', type: 'text', label: 'Identifiant source', index: true },
        { name: 'url', type: 'text', label: 'Lien source' },
        { name: 'notoriety', type: 'number', label: 'Notoriété (nombre de Wikipédias)', admin: { readOnly: true } },
        { name: 'notes', type: 'textarea', label: 'Notes de source (internes, jamais publiées)' },
      ],
    },
    { name: 'slug', type: 'text', label: 'Adresse de la page', unique: true, index: true, admin: { position: 'sidebar', description: 'Généré depuis le nom. /adresses/…' } },
  ],
}
