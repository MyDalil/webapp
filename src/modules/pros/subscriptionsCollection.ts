import { revalidateTag } from 'next/cache'
import type { Access, CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook, CollectionConfig, Payload } from 'payload'
import { isAdmin, isAdminUser, isMember } from '@/platform/access'
import { revalidateLangs } from '@/platform/revalidate'
import { countryField } from './country'
import { SPONSOR_PAGES } from './sponsoringCore'
import { PLAN_LABEL, SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES, TARGET_LABEL, TARGET_PATH, SUBSCRIPTION_TARGETS, isPlan, isTarget, subscriptionPeriod } from './subscriptionsCore'

/** Étiquette du cache des abonnements en cours (`planOf`). */
export const SUBSCRIPTIONS_TAG = 'subscriptions'

/**
 * Un abonnement change : vide le cache `subscriptions`, rafraîchit la fiche concernée (3 langues) et ses listes.
 * Sans `server-only` (chargé aussi par la CLI Payload). Hors contexte Next : rien à rafraîchir, aucune erreur.
 */
export async function refreshSubscriptionTarget(payload: Payload, targetCollection: unknown, targetId: unknown) {
  try {
    revalidateTag(SUBSCRIPTIONS_TAG, { expire: 0 })
  } catch {
    return
  }
  if (!isTarget(targetCollection) || targetId == null || targetId === '') return
  const paths = new Set<string>(SPONSOR_PAGES[targetCollection])
  try {
    const doc = (await payload.findByID({ collection: targetCollection, id: String(targetId), depth: 0, overrideAccess: true })) as { slug?: string | null }
    if (doc?.slug) paths.add(TARGET_PATH[targetCollection](doc.slug))
  } catch {
    /* fiche supprimée : listes seulement */
  }
  for (const path of paths) {
    try {
      revalidateLangs(path, path === '/' ? 'page' : 'layout')
    } catch {
      /* hors contexte Next */
    }
  }
}

/** Passage à « active » sans dates : période calculée selon le plan (annuel = 12 mois ; les mois offerts baissent le prix). */
const fillPeriod: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const status = data.status ?? originalDoc?.status
  if (status !== 'active' || originalDoc?.status === 'active') return data
  const plan = data.plan ?? originalDoc?.plan
  if (!isPlan(plan) || (data.endsAt ?? originalDoc?.endsAt)) return data
  return { ...data, ...subscriptionPeriod(plan) }
}

const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  await refreshSubscriptionTarget(req.payload, doc?.targetCollection, doc?.targetId)
  if (previousDoc && (previousDoc.targetCollection !== doc.targetCollection || String(previousDoc.targetId) !== String(doc.targetId)))
    await refreshSubscriptionTarget(req.payload, previousDoc.targetCollection, previousDoc.targetId)
  return doc
}
const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await refreshSubscriptionTarget(req.payload, doc?.targetCollection, doc?.targetId)
  return doc
}

/** Administrateur : tout ; membre connecté : ses abonnements seulement ; personne d’autre. */
const readOwn: Access = ({ req: { user } }) => (isAdminUser(user) ? true : isMember(user) ? { member: { equals: user.id } } : false)

/**
 * Abonnements des professionnels (une fiche = un abonnement). Écriture : administrateur seulement ; les routes du site
 * créent la demande côté serveur. Règle 4 : aucun lien avec `confiance` (formule « Partenaire », jamais « Vérifié »).
 */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: { singular: 'Abonnement', plural: 'Abonnements' },
  admin: { group: 'Professionnels', useAsTitle: 'targetId', defaultColumns: ['member', 'targetCollection', 'targetId', 'plan', 'status', 'endsAt'] },
  access: { read: readOwn, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  hooks: { beforeChange: [fillPeriod], afterChange: [afterChange], afterDelete: [afterDelete] },
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Compte professionnel', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'targetCollection', type: 'select', label: 'Type de fiche', required: true, options: SUBSCRIPTION_TARGETS.map((value) => ({ label: TARGET_LABEL[value], value })) },
        { name: 'targetId', type: 'text', label: 'Identifiant de la fiche', required: true, index: true },
      ],
    },
    { name: 'plan', type: 'select', label: 'Formule', required: true, options: SUBSCRIPTION_PLANS.map((value) => ({ label: PLAN_LABEL[value], value })) },
    {
      name: 'status',
      type: 'select',
      label: 'État',
      required: true,
      defaultValue: 'en_attente',
      index: true,
      options: SUBSCRIPTION_STATUSES.map((value) => ({ label: { en_attente: 'En attente', active: 'Actif', expiree: 'Expiré', annulee: 'Annulé' }[value], value })),
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', label: 'Début' },
        { name: 'endsAt', type: 'date', label: 'Fin', index: true, admin: { description: 'Calculée à l’activation si vide (annuel : 12 mois + mois offerts).' } },
      ],
    },
    { name: 'payment', type: 'relationship', relationTo: 'payments', label: 'Paiement', admin: { position: 'sidebar' } },
    { name: 'remindedAt', type: 'date', label: 'Rappel de fin envoyé le', admin: { position: 'sidebar', readOnly: true } },
    { name: 'note', type: 'textarea', label: 'Note interne', access: { read: ({ req }) => isAdminUser(req.user) } },
    countryField(),
  ],
}
