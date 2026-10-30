import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook } from 'payload'
import type { Access, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { isStaff } from '@/platform/access'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { DAYS, LANGUAGES, SPECIALTIES } from './specialties'
import { indexPractitioner, unindexPractitioner } from './search'

/** Public : praticiens publiés. Équipe : tous. Les pros passent par /api/pro/* (champs autorisés uniquement). */
const readPublished: Access = (args) => (isStaff(args) ? true : { status: { equals: 'published' } })

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const prepare: CollectionBeforeValidateHook = ({ data }) => {
  if (data && !data.slug && data.name) data.slug = slugify(`${data.name} ${data.city ?? ''}`)
  return data
}

/** Fiche praticien mise en cache 1 h : rafraîchie tout de suite à l’enregistrement. */
const refreshPage: CollectionAfterChangeHook = ({ doc }) => {
  try {
    revalidatePath(`/praticiens/${doc.slug}`)
  } catch {
    // Hors requête Next (import, CLI) : rien à rafraîchir.
  }
  return doc
}

export const Practitioners: CollectionConfig = {
  slug: 'practitioners',
  labels: { singular: 'Praticien', plural: 'Praticiens' },
  admin: { group: 'Santé', useAsTitle: 'name', defaultColumns: ['name', 'specialties', 'city', 'status', 'identityVerified'] },
  access: { read: readPublished, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { beforeValidate: [prepare], afterChange: [indexPractitioner, refreshPage], afterDelete: [unindexPractitioner] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Profil',
          fields: [
            { type: 'row', fields: [{ name: 'name', type: 'text', label: 'Nom affiché', required: true, admin: { description: 'Ex. Dr Amina Benali' } }, { name: 'title', type: 'text', label: 'Titre', admin: { description: 'Ex. Médecin généraliste' } }] },
            { name: 'specialties', type: 'select', hasMany: true, required: true, label: 'Spécialités', options: SPECIALTIES.map((s) => ({ label: `${s.label}${s.group === 'Pratiques complémentaires' ? ' (complémentaire)' : ''}`, value: s.value })) },
            { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
            { name: 'bio', type: 'textarea', label: 'Présentation', maxLength: 1500 },
            { name: 'languages', type: 'select', hasMany: true, label: 'Langues parlées', options: LANGUAGES.map((l) => ({ ...l })) },
          ],
        },
        {
          label: 'Cabinet',
          fields: [
            { name: 'cabinetName', type: 'text', label: 'Nom du cabinet ou de la clinique' },
            { name: 'address', type: 'text', label: 'Adresse' },
            { type: 'row', fields: [{ name: 'city', type: 'text', label: 'Ville', required: true }, { name: 'wilaya', type: 'select', label: 'Wilaya', options: WILAYAS.map((w) => ({ label: `${String(w.code).padStart(2, '0')} — ${w.name}`, value: String(w.code) })) }] },
            { type: 'row', fields: [{ name: 'lat', type: 'number', label: 'Latitude' }, { name: 'lng', type: 'number', label: 'Longitude' }] },
            { name: 'phone', type: 'text', label: 'Téléphone du cabinet' },
          ],
        },
        {
          label: 'Consultations',
          fields: [
            { name: 'modes', type: 'select', hasMany: true, required: true, defaultValue: ['cabinet'], label: 'Types de consultation', options: [{ label: 'Au cabinet', value: 'cabinet' }, { label: 'En visio', value: 'visio' }] },
            { type: 'row', fields: [{ name: 'fee', type: 'text', label: 'Tarif', admin: { description: 'Ex. 2 500 DA' } }, { name: 'payment', type: 'text', label: 'Paiement', admin: { description: 'Ex. Espèces au cabinet, BaridiMob' } }] },
            { name: 'paymentLink', type: 'text', label: 'Lien de paiement du praticien (facultatif)', admin: { description: 'DALIL n’encaisse rien : le patient paie directement le praticien.' } },
            {
              type: 'row',
              fields: [
                { name: 'slotMinutes', type: 'number', label: 'Durée d’un rendez-vous (min)', defaultValue: 30, min: 10, max: 240 },
                { name: 'minNoticeHours', type: 'number', label: 'Délai minimum de réservation (h)', defaultValue: 2, min: 0 },
                { name: 'horizonDays', type: 'number', label: 'Agenda ouvert sur (jours)', defaultValue: 60, min: 1, max: 365 },
                { name: 'cancelNoticeHours', type: 'number', label: 'Annulation par le patient jusqu’à (h avant)', defaultValue: 24, min: 0 },
              ],
            },
            {
              name: 'weekly',
              type: 'array',
              label: 'Horaires de consultation (heure d’Alger)',
              labels: { singular: 'Plage', plural: 'Plages' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'day', type: 'select', required: true, label: 'Jour', options: DAYS.map((d, i) => ({ label: d, value: String(i) })) },
                    { name: 'start', type: 'text', required: true, label: 'De', admin: { description: 'HH:MM' } },
                    { name: 'end', type: 'text', required: true, label: 'À', admin: { description: 'HH:MM' } },
                    { name: 'mode', type: 'select', label: 'Type', defaultValue: 'both', options: [{ label: 'Cabinet et visio', value: 'both' }, { label: 'Cabinet', value: 'cabinet' }, { label: 'Visio', value: 'visio' }] },
                  ],
                },
              ],
            },
            {
              name: 'closures',
              type: 'array',
              label: 'Absences et congés',
              fields: [{ type: 'row', fields: [{ name: 'from', type: 'date', required: true, label: 'Du' }, { name: 'to', type: 'date', required: true, label: 'Au' }, { name: 'note', type: 'text', label: 'Motif (interne)' }] }],
            },
          ],
        },
        {
          label: 'Vérification',
          fields: [
            { type: 'row', fields: [{ name: 'identityVerified', type: 'checkbox', label: 'Identité vérifiée' }, { name: 'verifiedAt', type: 'date', label: 'Vérifié le' }, { name: 'verifiedBy', type: 'text', label: 'Vérifié par' }] },
            {
              name: 'diplomas',
              type: 'array',
              label: 'Diplômes et autorisations d’exercice',
              fields: [
                { type: 'row', fields: [{ name: 'title', type: 'text', required: true, label: 'Intitulé' }, { name: 'institution', type: 'text', label: 'Établissement' }, { name: 'year', type: 'number', label: 'Année' }, { name: 'verified', type: 'checkbox', label: 'Vérifié' }] },
              ],
            },
            { name: 'internalNote', type: 'textarea', label: 'Note interne (jamais publiée)' },
          ],
        },
      ],
    },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending', label: 'Statut', options: [{ label: 'En attente de vérification', value: 'pending' }, { label: 'Publié', value: 'published' }, { label: 'Suspendu', value: 'suspended' }], admin: { position: 'sidebar', description: 'Publication uniquement après vérification de l’identité et du droit d’exercer.' } },
    { name: 'demo', type: 'checkbox', label: 'Fiche de démonstration', defaultValue: false, admin: { position: 'sidebar', description: 'Affiche un bandeau « Démo » : aucun vrai praticien derrière.' } },
    { name: 'owner', type: 'relationship', relationTo: 'members', label: 'Compte professionnel', admin: { position: 'sidebar' } },
    { name: 'slug', type: 'text', unique: true, index: true, label: 'Adresse de la page', admin: { position: 'sidebar', description: '/praticiens/…' } },
  ],
}
