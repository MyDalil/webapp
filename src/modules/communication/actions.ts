import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { payload as getPayload } from '@/platform/http'
import { SITE } from '@/platform/mail'
import { SECTORS, WILAYAS } from '@/platform/referentiel/catalog'
import { staffReq, requireRole, OpsError } from '@/platform/ops/context'
import { composeDigest, telegramSummary, type DigestPlace } from './digest'

type Campaign = { id: number; subject: string; title: string; body: string; ctaLabel?: string | null; ctaUrl?: string | null; sentAt?: string | null; recipients?: number | null }

const wilayaCode = (v?: string) => {
  if (!v) return undefined
  const t = v.trim().toLowerCase()
  const w = WILAYAS.find((x) => String(x.code) === String(Number(t)) || x.name.toLowerCase() === t)
  if (!w) throw new OpsError(`Wilaya inconnue : ${v}.`)
  return w
}

/** Brouillon Telegram (canal) : publication décidée par Saïd seul, par la garde existante de la collection. */
async function channelPost(ctx: Parameters<ActionDef['run']>[1], data: { title: string; text: string; buttons?: { label: string; url: string }[] }, publish: boolean) {
  const p = await getPayload()
  const req = await staffReq(p, ctx)
  const post = (await p.create({ collection: 'telegram-posts', req, overrideAccess: false, data: { title: data.title.slice(0, 120), text: data.text.slice(0, 4096), buttons: data.buttons, status: 'draft' } as never })) as unknown as { id: number }
  const patron = ctx.principal.kind === 'staff' && ctx.principal.role === 'patron'
  if (publish && patron) {
    // Décision de Saïd : « Programmée » sans date = envoi immédiat après la réponse (channelOnDecision).
    await p.update({ collection: 'telegram-posts', id: post.id, req, overrideAccess: false, data: { status: 'scheduled' } as never })
    return { id: post.id, etat: 'publication en cours' }
  }
  return { id: post.id, etat: 'brouillon — en attente de la décision de Saïd' }
}

export const actions: ActionDef[] = [
  {
    name: 'preparer_newsletter',
    title: 'Préparer une newsletter',
    description:
      'Compose un brouillon de newsletter à partir des adresses publiées récemment (wilaya et/ou rubrique facultatives) et renvoie l’aperçu. Rien n’est envoyé. Textes repris des fiches, jamais inventés.',
    module: 'communication',
    access: 'staff',
    readOnly: false,
    input: {
      type: 'object',
      properties: {
        wilaya: { type: 'string', description: 'Nom ou code de la wilaya.' },
        rubrique: { type: 'string', enum: SECTORS.map((s) => s.slug) },
        jours: { type: 'number', default: 30, description: 'Fiches publiées ou mises à jour depuis N jours.' },
        limite: { type: 'number', default: 8 },
        objet: { type: 'string', description: 'Objet de l’email (sinon objet proposé).' },
      },
    },
    run: async (input: { wilaya?: string; rubrique?: string; jours?: number; limite?: number; objet?: string }, ctx) => {
      requireRole(ctx, 'staff')
      const w = wilayaCode(input.wilaya)
      const sector = input.rubrique ? SECTORS.find((s) => s.slug === input.rubrique) : undefined
      if (input.rubrique && !sector) throw new OpsError(`Rubrique inconnue : ${input.rubrique}.`)
      const since = new Date(Date.now() - Math.min(Math.max(input.jours ?? 30, 1), 365) * 86_400_000).toISOString()
      const p = await getPayload()
      const and: Record<string, unknown>[] = [{ _status: { equals: 'published' } }, { updatedAt: { greater_than: since } }]
      if (w) and.push({ wilaya: { equals: String(w.code) } })
      if (sector) and.push({ sector: { equals: sector.slug } })
      const { docs } = await p.find({ collection: 'places', where: { and } as never, sort: '-score', limit: Math.min(Math.max(input.limite ?? 8, 1), 20), depth: 0, overrideAccess: true, select: { name: true, city: true, category: true, intro: true, slug: true } as never })
      const places = docs as unknown as DigestPlace[]
      if (!places.length) throw new OpsError('Aucune adresse publiée sur cette période : pas de newsletter à préparer.')
      const draft = composeDigest(places, { wilaya: w?.name, rubrique: sector?.title, site: SITE, subject: input.objet })
      const req = await staffReq(p, ctx)
      const doc = (await p.create({ collection: 'campaigns', req, overrideAccess: false, data: draft })) as unknown as Campaign
      return { id: doc.id, apercu: draft, fiches: places.length, suite: 'Relire dans /admin › Envois newsletter, s’envoyer un test, puis envoyer_newsletter (administrateur).' }
    },
  },
  {
    name: 'envoyer_newsletter',
    title: 'Envoyer une newsletter',
    description:
      'Envoie une newsletter en brouillon aux abonnés confirmés (envoi unique et définitif, logique existante), puis prépare le même résumé pour le canal Telegram (publié si Saïd le demande, sinon brouillon pour Saïd). Exige confirmer: true.',
    module: 'communication',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['id', 'confirmer'], properties: { id: { type: 'number' }, confirmer: { type: 'boolean', description: 'true pour envoyer réellement (irréversible).' }, canal: { type: 'boolean', default: true, description: 'Préparer aussi le résumé Telegram.' } } },
    run: async (input: { id: number; confirmer?: boolean; canal?: boolean }, ctx) => {
      requireRole(ctx, 'admin')
      const p = await getPayload()
      const c = (await p.findByID({ collection: 'campaigns', id: input.id, depth: 0, overrideAccess: true })) as unknown as Campaign
      if (c.sentAt) throw new OpsError(`Newsletter déjà envoyée le ${c.sentAt} : un envoi part une seule fois.`)
      if (input.confirmer !== true) return { simulation: true, objet: c.subject, message: 'Ajoutez confirmer: true pour envoyer. Envoi définitif.' }
      const req = await staffReq(p, ctx)
      // Logique existante : le hook `dispatch` de la collection envoie aux abonnés confirmés et pose sentAt (garde d’envoi unique).
      const after = (await p.update({ collection: 'campaigns', id: c.id, req, overrideAccess: false, data: { sendNow: true } as never })) as unknown as Campaign
      const sent = (await p.findByID({ collection: 'campaigns', id: c.id, depth: 0, overrideAccess: true })) as unknown as Campaign
      const canal = input.canal === false ? null : await channelPost(ctx, telegramSummary(sent ?? after, SITE), true)
      return { envoyee: Boolean(sent.sentAt), destinataires: sent.recipients ?? 0, canal }
    },
  },
  {
    name: 'publier_canal',
    title: 'Publier sur le canal Telegram',
    description:
      'Prépare un message du canal Telegram DALIL (titre + texte, liens facultatifs) ou, avec id, demande la publication d’un brouillon existant. Seul Saïd (patron) publie : pour un autre administrateur, le message reste en brouillon pour Saïd.',
    module: 'communication',
    access: 'admin',
    readOnly: false,
    input: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Brouillon existant à publier.' },
        titre: { type: 'string' },
        texte: { type: 'string' },
        liens: { type: 'array', maxItems: 3, items: { type: 'object', required: ['label', 'url'], properties: { label: { type: 'string' }, url: { type: 'string' } } } },
      },
    },
    run: async (input: { id?: number; titre?: string; texte?: string; liens?: { label: string; url: string }[] }, ctx) => {
      requireRole(ctx, 'admin')
      if (input.id != null) {
        const patron = ctx.principal.kind === 'staff' && ctx.principal.role === 'patron'
        if (!patron) return { id: input.id, etat: 'brouillon — seul Saïd publie sur le canal' }
        const p = await getPayload()
        await p.update({ collection: 'telegram-posts', id: input.id, req: await staffReq(p, ctx), overrideAccess: false, data: { status: 'scheduled' } as never })
        return { id: input.id, etat: 'publication en cours' }
      }
      if (!input.texte?.trim()) throw new OpsError('Texte du message manquant.')
      return channelPost(ctx, { title: input.titre?.trim() || input.texte.trim().slice(0, 60), text: input.texte.trim(), buttons: input.liens?.slice(0, 3) }, true)
    },
  },
]
