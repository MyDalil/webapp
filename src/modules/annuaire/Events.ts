import type { CollectionAfterChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { isAdmin, isStaff, publishedOrStaff } from '@/platform/access'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { EVENT_TYPES } from './weekend'

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Slug automatique ; un événement « confirmé » doit citer sa source (règle : jamais d’information sans source). */
const prepare: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data
  if (!data.slug && data.title && data.startsAt) data.slug = slugify(`${data.title} ${String(data.startsAt).slice(0, 10)}`)
  if (data.free) data.priceMin = null
  return data
}
const confirmedNeedsSource = (value: unknown, { siblingData }: { siblingData?: { reliability?: string; sourceUrl?: string } }) =>
  value !== 'confirmed' || Boolean(siblingData?.sourceUrl?.trim()) || 'Un événement confirmé doit avoir une source (site officiel, organisateur, affiche).'

const refresh: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidate) return doc
  try {
    revalidatePath('/que-faire-ce-week-end')
    revalidatePath('/')
  } catch {}
  return doc
}

/**
 * Événements et activités datés (page « Que faire ce week-end ? »). Saisis par l’équipe ou issus de
 * contributions validées. Un événement terminé n’apparaît plus jamais dans les sélections à venir.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Événement', plural: 'Événements' },
  admin: { group: 'Annuaire', useAsTitle: 'title', defaultColumns: ['title', 'startsAt', 'wilaya', 'reliability', '_status'], listSearchableFields: ['title', 'city', 'organizer'] },
  versions: { drafts: true },
  defaultSort: 'startsAt',
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks: { beforeValidate: [prepare], afterChange: [refresh] },
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: 120 },
    {
      type: 'row',
      fields: [
        { name: 'type', type: 'select', label: 'Type d’activité', required: true, options: EVENT_TYPES.map(([value, label]) => ({ value, label })) },
        {
          name: 'reliability',
          type: 'select',
          label: 'Fiabilité',
          required: true,
          defaultValue: 'incomplete',
          options: [
            { value: 'confirmed', label: 'Confirmé (source vérifiée)' },
            { value: 'incomplete', label: 'Informations incomplètes' },
          ],
          validate: confirmedNeedsSource as never,
        },
      ],
    },
    { name: 'intro', type: 'textarea', label: 'Présentation', maxLength: 600, admin: { description: 'Deux ou trois phrases factuelles.' } },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', label: 'Début', required: true, admin: { date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm', displayFormat: 'd MMM yyyy HH:mm' } } },
        { name: 'endsAt', type: 'date', label: 'Fin', admin: { date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm', displayFormat: 'd MMM yyyy HH:mm' }, description: 'Vide : le jour même.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'wilaya', type: 'select', label: 'Wilaya', required: true, options: WILAYAS.map((w) => ({ label: `${String(w.code).padStart(2, '0')} — ${w.name}`, value: String(w.code) })) },
        { name: 'city', type: 'text', label: 'Ville', required: true },
      ],
    },
    { name: 'place', type: 'relationship', relationTo: 'places', label: 'Lieu de l’annuaire', admin: { description: 'Facultatif : la fiche DALIL du lieu.' } },
    { name: 'address', type: 'text', label: 'Adresse ou repère' },
    {
      type: 'row',
      fields: [
        { name: 'free', type: 'checkbox', label: 'Gratuit' },
        { name: 'priceMin', type: 'number', label: 'Prix à partir de (DA)', min: 0, admin: { condition: (d) => !d.free } },
        { name: 'priceNote', type: 'text', label: 'Précision sur le prix', admin: { condition: (d) => !d.free } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'family', type: 'checkbox', label: 'Adapté aux enfants' },
        {
          name: 'accessible',
          type: 'select',
          label: 'Accessible en fauteuil',
          defaultValue: 'unknown',
          options: [
            { value: 'yes', label: 'Oui' },
            { value: 'no', label: 'Non' },
            { value: 'unknown', label: 'À vérifier' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'bookingUrl', type: 'text', label: 'Réservation (lien)' },
        { name: 'organizer', type: 'text', label: 'Organisateur' },
      ],
    },
    { name: 'sourceUrl', type: 'text', label: 'Source', admin: { description: 'Obligatoire pour un événement confirmé.' } },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo', admin: { description: 'Sous licence, auteur affiché. Vide : la photo du lieu lié.' } },
    { name: 'contributor', type: 'text', label: 'Proposé par', admin: { position: 'sidebar', description: 'Nom ou pseudonyme du contributeur, s’il souhaite être cité.' } },
    { name: 'slug', type: 'text', label: 'Adresse web', unique: true, index: true, admin: { position: 'sidebar' } },
  ],
}
