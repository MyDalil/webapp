import 'server-only'
import { payload } from '@/platform/http'
import { SITE, TEAM, esc, layout, paragraphs, send } from '@/platform/mail'
import { effectiveMode, priceLabel, type Mode } from './rules'

export type Pack = {
  id: number
  title: string
  slug: string
  demarche: string
  guide: string
  summary: string
  includes: { item: string }[]
  priceEur: number | null
  priceDa: number | null
  perPerson: boolean
  price: { main: string; sub: string | null }
}

type Settings = { mode?: Mode; paymentEnabled?: boolean; whatsapp?: string | null; notifyEmail?: string | null }

async function settings(): Promise<Settings> {
  try {
    return (await (await payload()).findGlobal({ slug: 'accompagnement', overrideAccess: true, depth: 0 })) as Settings
  } catch {
    return {}
  }
}

/** État de l’offre : mode appliqué (caché en production tant que Rad n’a pas lancé) et paiement. */
export async function offerState() {
  const s = await settings()
  // VERCEL_ENV vaut « production » seulement sur www.mydalil.com (preview, CI et local : offre visible pour l’équipe).
  const mode = effectiveMode(s.mode, process.env.VERCEL_ENV)
  return { mode, visible: mode !== 'cache', paymentEnabled: Boolean(s.paymentEnabled) }
}

const shape = (d: Record<string, unknown>): Pack => {
  const p = d as unknown as Omit<Pack, 'price'>
  return { ...p, includes: p.includes ?? [], priceEur: p.priceEur ?? null, priceDa: p.priceDa ?? null, perPerson: Boolean(p.perPerson), price: priceLabel(p) }
}

/** Packs proposés (vide si l’offre est cachée). */
export async function listPacks(): Promise<Pack[]> {
  if (!(await offerState()).visible) return []
  const r = await (await payload()).find({ collection: 'packs', where: { active: { equals: true } }, sort: 'order', limit: 100, depth: 0, overrideAccess: true })
  return r.docs.map((d) => shape(d as unknown as Record<string, unknown>))
}

export async function packBySlug(slug: string) {
  return (await listPacks()).find((p) => p.slug === slug) ?? null
}

/** Pack lié à un guide gratuit (chemin de la page), ou null. */
export async function packForGuide(guide: string) {
  return (await listPacks()).find((p) => p.guide === guide) ?? null
}

/** Guides qui ont un pack : chemin → slug du pack. */
export async function packsByGuide() {
  return new Map((await listPacks()).map((p) => [p.guide, p.slug]))
}

export type RequestInput = { pack: string; name: string; email: string; phone: string; country: string; message: string; persons: number }

/** Enregistre une demande, prévient l’équipe et accuse réception. Aucun paiement à ce stade. */
export async function createRequest(input: RequestInput): Promise<{ ok: true; waitlist: boolean } | { ok: false; error: string }> {
  const state = await offerState()
  if (state.mode !== 'ouvert') return { ok: false, error: 'L’accompagnement est à venir.' }
  const pack = await packBySlug(input.pack)
  if (!pack) return { ok: false, error: 'Pack introuvable.' }
  const waitlist = state.mode !== 'ouvert'
  const p = await payload()
  const doc = await p.create({
    collection: 'demandes-accompagnement',
    overrideAccess: true,
    data: { pack: pack.id, name: input.name, email: input.email, phone: input.phone || undefined, country: input.country || undefined, message: input.message || undefined, persons: pack.perPerson ? input.persons : 1, status: waitlist ? 'attente' : 'a-contacter' },
  })
  const s = await settings()
  const team = s.notifyEmail || TEAM
  await send(
    team,
    `Accompagnement : ${pack.demarche} — ${input.name}`,
    layout(
      `Nouvelle demande d’accompagnement`,
      `<p><b>${esc(pack.title)}</b>${pack.perPerson ? ` · ${input.persons} personne(s)` : ''}${waitlist ? ' (liste d’attente)' : ''}</p><p>${esc(input.name)} · ${esc(input.email)}${input.phone ? ` · ${esc(input.phone)}` : ''}${input.country ? ` · ${esc(input.country)}` : ''}</p>${input.message ? paragraphs(input.message) : ''}`,
      { label: 'Ouvrir la demande', href: `${SITE}/admin/collections/demandes-accompagnement/${doc.id}` },
    ),
  )
  await send(
    input.email,
    waitlist ? `Vous êtes sur la liste d’attente — ${pack.demarche}` : `Demande reçue — ${pack.demarche}`,
    layout(
      waitlist ? 'Vous êtes sur la liste d’attente' : 'Votre demande est bien reçue',
      `<p>Bonjour ${esc(input.name)},</p><p>${
        waitlist
          ? `L’accompagnement « ${esc(pack.title)} » ouvre bientôt. Nous vous écrirons dès son ouverture. Vous n’avez rien à payer aujourd’hui.`
          : `Un conseiller DALIL vous contacte pour fixer votre appel. Vous n’avez rien à payer avant cet échange.`
      }</p><p>En attendant, le guide gratuit reste disponible. Les démarches peuvent être réalisées gratuitement sur les sites officiels de l’État algérien.</p>`,
      { label: 'Lire le guide gratuit', href: `${SITE}${pack.guide}` },
    ),
  )
  return { ok: true, waitlist }
}
