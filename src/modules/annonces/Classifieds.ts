import type { Access, CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'
import { isAgent, isMember, isStaffUser } from '@/platform/access'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { AGENT_VERDICTS, ALL_SUBS, CATEGORIES, CONDITIONS, CONTRACTS, DEALS, FUELS, GEARBOXES, PRICE_MODES, RULES, STATUSES, expiryFrom, isSub } from './referentiel'
import { classifiedPublished, classifiedRejected } from './emails'
import { refreshPages } from './refresh'
import { indexClassified, unindexClassified } from './search'

/**
 * Lecture : public = annonces publiées ; auteur = les siennes ; équipe et agents = toutes (contrôle).
 * Écriture : équipe ; agents = leur avis seulement ; auteurs = par /api/annonces (champs autorisés).
 */
const read: Access = ({ req: { user } }) => {
  if (isStaffUser(user) || isAgent(user)) return true
  if (isMember(user)) return { or: [{ status: { equals: 'published' } }, { author: { equals: user.id } }] } as Where
  return { status: { equals: 'published' } }
}
const write: Access = ({ req: { user } }) => isStaffUser(user) || isAgent(user)
const staffOnly: Access = ({ req: { user } }) => isStaffUser(user)

/** Champs qu’un agent peut écrire : son avis. Rien d’autre (il ne publie jamais). */
const AGENT_FIELDS = new Set(['agentVerdict', 'agentNote', 'agentReviewedAt', 'agentName'])

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

const prepare: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const title = data.title ?? originalDoc?.title
  if (!data.slug && !originalDoc?.slug && title) data.slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`
  const cat = data.category ?? originalDoc?.category
  const sub = data.subcategory ?? originalDoc?.subcategory
  if (cat && sub && !isSub(cat, String(sub).split(':')[1] ?? '')) throw new APIError('La sous-catégorie ne correspond pas à la catégorie.', 400, null, true)
  return data
}

const guard: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const user = req.user
  if (isAgent(user)) {
    const extra = Object.keys(data).filter((k) => !AGENT_FIELDS.has(k) && JSON.stringify(data[k]) !== JSON.stringify(originalDoc?.[k]))
    if (extra.length) throw new APIError(`Un agent donne seulement son avis. Champs refusés : ${extra.join(', ')}.`, 403)
    data.agentReviewedAt = new Date().toISOString()
    data.agentName = user.name
    return data
  }
  const next = { ...originalDoc, ...data }
  // Publication : date de publication et d’expiration, trace de l’humain qui publie.
  if (next.status === 'published' && originalDoc?.status !== 'published') {
    const now = new Date()
    data.publishedAt = now.toISOString()
    if (next.example) data.expiresAt = null
    else if (!next.expiresAt || Date.parse(next.expiresAt) <= now.getTime()) data.expiresAt = expiryFrom(now).toISOString()
    data.expiryWarnedAt = null
    if (isStaffUser(user)) {
      data.moderatedAt = now.toISOString()
      data.moderatedBy = (user as { name?: string; email?: string }).name || (user as { email?: string }).email
    }
  }
  if (next.status === 'rejected' && originalDoc?.status !== 'rejected') {
    if (!next.rejectionReason) throw new APIError('Indiquez le motif du refus : il est envoyé à l’auteur.', 400, null, true)
    data.moderatedAt = new Date().toISOString()
    if (isStaffUser(user)) data.moderatedBy = (user as { name?: string; email?: string }).name || (user as { email?: string }).email
  }
  return data
}

/** Publication ou refus par l’équipe : l’auteur est prévenu par email. Pages publiques rafraîchies. */
const notify: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status !== previousDoc?.status && (doc.status === 'published' || doc.status === 'rejected')) {
    const authorId = typeof doc.author === 'object' ? doc.author?.id : doc.author
    const author = authorId ? await req.payload.findByID({ collection: 'members', id: authorId, depth: 0, overrideAccess: true, req }).catch(() => null) : null
    if (author?.email) {
      const send = doc.status === 'published' ? classifiedPublished : classifiedRejected
      await send(author.email, { title: doc.title, slug: doc.slug, category: doc.category, reason: doc.rejectionReason ?? '' }).catch(() => {})
    }
  }
  refreshPages(doc.category, doc.slug)
  return doc
}

const opts = <T extends readonly { value: string; label: string }[]>(l: T) => l.map((x) => ({ label: x.label, value: x.value }))
const only = (cat: string) => ({ condition: (data: Record<string, unknown>) => data?.category === cat })
const among = (...cats: string[]) => ({ condition: (data: Record<string, unknown>) => cats.includes(String(data?.category)) })

export const Classifieds: CollectionConfig = {
  slug: 'classifieds',
  labels: { singular: 'Annonce', plural: 'Annonces' },
  admin: {
    group: 'Annonces',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'example', 'agentVerdict', 'wilaya', 'reports', 'createdAt'],
    description: 'Annonces des membres. « À contrôler » : vérifier puis publier ou refuser (motif obligatoire, envoyé à l’auteur).',
  },
  access: { read, create: staffOnly, update: write, delete: staffOnly },
  hooks: { beforeValidate: [prepare], beforeChange: [guard], afterChange: [notify, indexClassified], afterDelete: [unindexClassified] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Annonce',
          fields: [
            { name: 'title', type: 'text', label: 'Titre', required: true, maxLength: RULES.titleMax },
            { name: 'slug', type: 'text', label: 'Adresse de la page', unique: true, index: true, admin: { readOnly: true } },
            {
              type: 'row',
              fields: [
                { name: 'category', type: 'select', label: 'Catégorie', required: true, index: true, options: CATEGORIES.map((c) => ({ label: c.label, value: c.value })) },
                { name: 'subcategory', type: 'select', label: 'Type', required: true, index: true, options: ALL_SUBS },
              ],
            },
            { name: 'description', type: 'textarea', label: 'Description', required: true, maxLength: RULES.descriptionMax },
            {
              type: 'row',
              fields: [
                { name: 'price', type: 'number', label: 'Prix ou salaire (DA)', min: 0 },
                { name: 'priceMode', type: 'select', label: 'Prix', defaultValue: 'fixed', required: true, options: opts(PRICE_MODES) },
              ],
            },
            { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, maxRows: RULES.maxPhotos, label: 'Photos' },
          ],
        },
        {
          label: 'Caractéristiques',
          fields: [
            { type: 'row', fields: [{ name: 'deal', type: 'select', label: 'Transaction', options: opts(DEALS), admin: only('immobilier') }, { name: 'rooms', type: 'number', label: 'Pièces (F…)', min: 1, max: 20, admin: only('immobilier') }, { name: 'surface', type: 'number', label: 'Surface (m²)', min: 1, admin: only('immobilier') }, { name: 'furnished', type: 'checkbox', label: 'Meublé', admin: only('immobilier') }] },
            { type: 'row', fields: [{ name: 'contract', type: 'select', label: 'Contrat', options: opts(CONTRACTS), admin: only('emploi') }, { name: 'sector', type: 'text', label: 'Secteur d’activité', maxLength: 80, admin: only('emploi') }] },
            { type: 'row', fields: [{ name: 'brand', type: 'text', label: 'Marque', maxLength: 40, admin: only('vehicules') }, { name: 'model', type: 'text', label: 'Modèle', maxLength: 60, admin: only('vehicules') }, { name: 'year', type: 'number', label: 'Année', min: 1950, max: 2100, admin: only('vehicules') }, { name: 'mileage', type: 'number', label: 'Kilométrage', min: 0, admin: only('vehicules') }] },
            { type: 'row', fields: [{ name: 'fuel', type: 'select', label: 'Énergie', options: opts(FUELS), admin: only('vehicules') }, { name: 'gearbox', type: 'select', label: 'Boîte', options: opts(GEARBOXES), admin: only('vehicules') }, { name: 'condition', type: 'select', label: 'État', options: opts(CONDITIONS), admin: among('vehicules', 'objets') }] },
          ],
        },
        {
          label: 'Lieu',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'wilaya', type: 'select', label: 'Wilaya', required: true, index: true, options: WILAYAS.filter((w) => !w.transition).map((w) => ({ label: `${String(w.code).padStart(2, '0')} — ${w.name}`, value: String(w.code) })) },
                { name: 'commune', type: 'text', label: 'Commune', admin: { description: 'Identifiant du référentiel des communes (ex. 16-bab-el-oued).' } },
              ],
            },
          ],
        },
        {
          label: 'Auteur',
          fields: [
            { name: 'author', type: 'relationship', relationTo: 'members', label: 'Compte', index: true, validate: (v: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => (v || siblingData?.example ? true : 'Compte requis.') },
            { type: 'row', fields: [{ name: 'authorName', type: 'text', label: 'Nom affiché' }, { name: 'authorKind', type: 'select', label: 'Annonceur', options: [{ label: 'Particulier', value: 'particulier' }, { label: 'Professionnel', value: 'pro' }] }] },
          ],
        },
        {
          label: 'Contrôle',
          fields: [
            { type: 'row', fields: [{ name: 'status', type: 'select', label: 'État', required: true, defaultValue: 'pending', index: true, options: opts(STATUSES) }, { name: 'reports', type: 'number', label: 'Signalements', defaultValue: 0, admin: { readOnly: true } }] },
            { name: 'example', type: 'checkbox', label: 'Annonce d’exemple (badge « Exemple », non contactable, masquée dès qu’une vraie annonce existe dans le même type)', defaultValue: false, index: true },
            { name: 'rejectionReason', type: 'textarea', label: 'Motif du refus (envoyé à l’auteur)', maxLength: 500 },
            { type: 'row', fields: [{ name: 'moderatedBy', type: 'text', label: 'Contrôlée par', admin: { readOnly: true } }, { name: 'moderatedAt', type: 'date', label: 'Contrôlée le', admin: { readOnly: true } }] },
            { type: 'row', fields: [{ name: 'publishedAt', type: 'date', label: 'Publiée le', admin: { readOnly: true } }, { name: 'expiresAt', type: 'date', label: 'Expire le', index: true }, { name: 'expiryWarnedAt', type: 'date', label: 'Prévenu de l’expiration le', admin: { readOnly: true } }] },
            {
              type: 'collapsible',
              label: 'Avis de l’agent (proposition, jamais une décision)',
              fields: [
                { type: 'row', fields: [{ name: 'agentVerdict', type: 'select', label: 'Avis', options: opts(AGENT_VERDICTS) }, { name: 'agentName', type: 'text', label: 'Agent', admin: { readOnly: true } }, { name: 'agentReviewedAt', type: 'date', label: 'Le', admin: { readOnly: true } }] },
                { name: 'agentNote', type: 'textarea', label: 'Raisons', maxLength: 1500 },
              ],
            },
          ],
        },
      ],
    },
  ],
}
