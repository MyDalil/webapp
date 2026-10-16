import type { Access, CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isStaff } from '@/platform/access'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { LANGUAGES } from '@/platform/referentiel/languages'
import { ACTIVITIES, CATEGORIES, CLIENTELE, DAYS, GENDERS, isSensitive } from './activities'

/** Public : prestataires publiés. Équipe : tous. Les pros passent par /api/pro/prestataire (champs autorisés uniquement). */
const readPublished: Access = (args) => (isStaff(args) ? true : { status: { equals: 'published' } })

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const prepare: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const name = data.displayName ?? originalDoc?.displayName
  if (!data.slug && !originalDoc?.slug && name) data.slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`
  // Catégories et activités dérivées des prestations, pour la recherche.
  if (Array.isArray(data.offers)) {
    const acts = [...new Set((data.offers as { activity?: string }[]).map((o) => o.activity).filter(Boolean))] as string[]
    data.activities = acts
    data.categories = [...new Set(acts.map((a) => ACTIVITIES.find((x) => x.value === a)?.category).filter(Boolean))]
  }
  return data
}

/** Publication impossible sans les vérifications exigées (identité, statut légal, casier pour les missions sensibles). */
const guardPublication: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const next = { ...originalDoc, ...data }
  if (next.status !== 'published' || next.demo) return data
  const missing: string[] = []
  if (!next.identityVerified) missing.push('identité vérifiée')
  if (!next.legalVerified) missing.push('statut légal vérifié')
  if (isSensitive((next.activities ?? []) as string[])) {
    const at = next.backgroundCheckedAt ? Date.parse(next.backgroundCheckedAt) : NaN
    if (Number.isNaN(at)) missing.push('casier judiciaire vérifié (missions auprès d’enfants, de mineurs ou de personnes âgées)')
  }
  if (!next.gender) missing.push('genre')
  if (missing.length) throw new APIError(`Publication impossible : ${missing.join(', ')}.`, 400, null, true)
  return data
}

/** Une vérification faite : la pièce correspondante est supprimée (« consultée puis supprimée »). */
const purgeCheckedDocuments: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const kinds: string[] = []
  if (doc.identityVerified && !previousDoc?.identityVerified) kinds.push('identity')
  if (doc.legalVerified && !previousDoc?.legalVerified) kinds.push('legal')
  if (doc.backgroundCheckedAt && doc.backgroundCheckedAt !== previousDoc?.backgroundCheckedAt) kinds.push('background')
  if (kinds.length) await req.payload.delete({ collection: 'provider-documents', where: { and: [{ provider: { equals: doc.id } }, { kind: { in: kinds } }] }, overrideAccess: true, req })
  return doc
}

export const Providers: CollectionConfig = {
  slug: 'providers',
  labels: { singular: 'Prestataire', plural: 'Prestataires' },
  admin: { group: 'Services', useAsTitle: 'displayName', defaultColumns: ['displayName', 'categories', 'wilaya', 'status', 'identityVerified', 'legalVerified'] },
  access: { read: readPublished, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { beforeValidate: [prepare], beforeChange: [guardPublication], afterChange: [purgeCheckedDocuments] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Profil',
          fields: [
            { type: 'row', fields: [{ name: 'displayName', type: 'text', label: 'Nom affiché', required: true, maxLength: 60, admin: { description: 'Prénom et initiale du nom, ex. « Karim B. »' } }, { name: 'gender', type: 'select', label: 'Genre (vérifié avec l’identité)', options: GENDERS.map((g) => ({ ...g })) }] },
            { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
            { name: 'bio', type: 'textarea', label: 'Présentation', maxLength: 1500 },
            { type: 'row', fields: [{ name: 'languages', type: 'select', hasMany: true, label: 'Langues parlées', options: LANGUAGES.map((l) => ({ ...l })) }, { name: 'clientele', type: 'select', label: 'Clientèle acceptée', defaultValue: 'all', required: true, options: CLIENTELE.map((c) => ({ ...c })) }] },
            { name: 'experienceYears', type: 'number', label: 'Années d’expérience', min: 0, max: 70 },
          ],
        },
        {
          label: 'Prestations',
          fields: [
            {
              name: 'offers',
              type: 'array',
              label: 'Prestations et tarifs',
              labels: { singular: 'Prestation', plural: 'Prestations' },
              minRows: 1,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'activity', type: 'select', required: true, label: 'Activité', options: CATEGORIES.flatMap((c) => c.activities.map(([value, label]) => ({ label: `${c.label} — ${label}`, value }))) },
                    { name: 'pricing', type: 'select', required: true, defaultValue: 'hour', label: 'Tarif', options: [{ label: 'À l’heure', value: 'hour' }, { label: 'Forfait', value: 'flat' }] },
                    { name: 'price', type: 'number', label: 'Prix (DA)', min: 0 },
                    { name: 'unit', type: 'text', label: 'Unité du forfait', admin: { description: 'Ex. « la séance », « par meuble »' } },
                    { name: 'hours', type: 'number', label: 'Durée indicative (h)', defaultValue: 2, min: 0.5, max: 12, admin: { description: 'Bloque l’agenda pour un forfait.' } },
                  ],
                },
              ],
            },
            { name: 'categories', type: 'select', hasMany: true, label: 'Catégories', options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })), admin: { readOnly: true, description: 'Calculé depuis les prestations.' } },
            { name: 'activities', type: 'select', hasMany: true, label: 'Activités', options: ACTIVITIES.map((a) => ({ label: a.label, value: a.value })), admin: { readOnly: true, description: 'Calculé depuis les prestations.' } },
            { name: 'payment', type: 'text', label: 'Moyens de paiement acceptés', admin: { description: 'Ex. Espèces, BaridiMob, CIB/Edahabia. DALIL n’encaisse rien.' } },
          ],
        },
        {
          label: 'Zone',
          fields: [
            { name: 'wilaya', type: 'select', required: true, label: 'Wilaya', options: WILAYAS.filter((w) => !w.transition).map((w) => ({ label: `${String(w.code).padStart(2, '0')} — ${w.name}`, value: String(w.code) })) },
            { name: 'baseCommune', type: 'text', label: 'Commune de base', admin: { description: 'Identifiant du référentiel des communes (ex. 16-bab-el-oued).' } },
            { name: 'wholeWilaya', type: 'checkbox', label: 'Intervient dans toute la wilaya', defaultValue: false },
            { name: 'communes', type: 'text', hasMany: true, label: 'Communes desservies', admin: { description: 'Identifiants du référentiel des communes.' } },
            { name: 'radiusKm', type: 'number', label: 'Rayon d’intervention (km, bientôt)', min: 0, max: 200, admin: { description: 'Calcul interne à partir du centre des communes, sans service tiers. Pas encore utilisé pour la recherche.' } },
          ],
        },
        {
          label: 'Disponibilités',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'minNoticeHours', type: 'number', label: 'Délai minimum avant une mission (h)', defaultValue: 12, min: 0 },
                { name: 'horizonDays', type: 'number', label: 'Demandes ouvertes sur (jours)', defaultValue: 60, min: 1, max: 365 },
                { name: 'cancelNoticeHours', type: 'number', label: 'Annulation gratuite jusqu’à (h avant)', defaultValue: 24, min: 0 },
              ],
            },
            {
              name: 'weekly',
              type: 'array',
              label: 'Plages de disponibilité (heure d’Alger)',
              labels: { singular: 'Plage', plural: 'Plages' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'day', type: 'select', required: true, label: 'Jour', options: DAYS.map((d, i) => ({ label: d, value: String(i) })) },
                    { name: 'start', type: 'text', required: true, label: 'De', admin: { description: 'HH:MM' } },
                    { name: 'end', type: 'text', required: true, label: 'À', admin: { description: 'HH:MM' } },
                  ],
                },
              ],
            },
            { name: 'closures', type: 'array', label: 'Absences et congés', fields: [{ type: 'row', fields: [{ name: 'from', type: 'date', required: true, label: 'Du' }, { name: 'to', type: 'date', required: true, label: 'Au' }, { name: 'note', type: 'text', label: 'Motif (interne)' }] }] },
          ],
        },
        {
          label: 'Vérification',
          fields: [
            { type: 'row', fields: [{ name: 'identityVerified', type: 'checkbox', label: 'Identité vérifiée' }, { name: 'verifiedAt', type: 'date', label: 'Vérifiée le' }, { name: 'verifiedBy', type: 'text', label: 'Vérifiée par' }] },
            {
              type: 'row',
              fields: [
                { name: 'legalForm', type: 'select', label: 'Statut légal déclaré', options: [{ label: 'Auto-entrepreneur (carte ANAE)', value: 'auto-entrepreneur' }, { label: 'Registre de commerce', value: 'registre-commerce' }] },
                { name: 'legalNumber', type: 'text', label: 'Numéro déclaré', maxLength: 40 },
                { name: 'legalVerified', type: 'checkbox', label: 'Statut légal vérifié' },
              ],
            },
            { name: 'backgroundCheckedAt', type: 'date', label: 'Casier judiciaire (bulletin n° 3) vérifié le', admin: { description: 'Obligatoire pour garde d’enfants, aide à domicile, cours particuliers et coraniques. Le document est consulté puis supprimé : seule cette date est conservée.' } },
            { name: 'internalNote', type: 'textarea', label: 'Note interne (jamais publiée)' },
          ],
        },
      ],
    },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending', label: 'Statut', options: [{ label: 'En attente de vérification', value: 'pending' }, { label: 'Publié', value: 'published' }, { label: 'Suspendu', value: 'suspended' }], admin: { position: 'sidebar', description: 'Publication uniquement après les vérifications exigées (contrôlées automatiquement).' } },
    { name: 'demo', type: 'checkbox', label: 'Fiche de démonstration', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'owner', type: 'relationship', relationTo: 'members', label: 'Compte professionnel', admin: { position: 'sidebar' } },
    { name: 'slug', type: 'text', unique: true, index: true, label: 'Adresse de la page', admin: { position: 'sidebar', description: '/prestataires/…' } },
    { type: 'row', admin: { position: 'sidebar' }, fields: [{ name: 'ratingAvg', type: 'number', label: 'Note moyenne', admin: { readOnly: true } }, { name: 'ratingCount', type: 'number', label: 'Avis', defaultValue: 0, admin: { readOnly: true } }, { name: 'missionsDone', type: 'number', label: 'Missions réalisées', defaultValue: 0, admin: { readOnly: true } }] },
  ],
}
