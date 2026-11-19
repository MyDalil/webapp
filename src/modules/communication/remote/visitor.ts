import type { Payload } from 'payload'
import type { ActionContext } from '@/platform/actions/types'
import { SITE } from '@/platform/mail'
import { slugify } from '@/platform/referentiel/slug'
import { hit } from '@/platform/security/rateLimit'
import { signCallback, signingSecret } from '@/platform/telegram/callback'
import { notifyStaff } from '@/platform/telegram/notify'
import type { Button, Inbound, RemoteDeps, Transport } from './core'
import { finalizeLink } from './finalize'
import { fitInput, listOf, resolveAction } from './parse'
import { payloadSessions, type SessionState, type SessionStore } from './sessions'
import { findWilaya, matchCategory, normalizePhone, RUBRIQUES, TOP_WILAYAS, validActivity, validName, wilayaByCode, wilayaName, type Wilaya } from './validate'
import { botLang, TEXT, type BotLang } from './visitorText'

/**
 * Bot public (visiteurs) : distributeur fermé, sans IA, jamais. Menu fixe à 3 boutons, deux parcours guidés :
 * - « Chercher » : wilaya → rubrique → 3 fiches (action publique du registre) ;
 * - « Inscrire mon activité » : nom → activité → wilaya → téléphone → brouillon de fiche (places, _status draft), notification équipe,
 *   lien signé /finaliser.
 * Boutons visiteurs : données `v:…` non signées (aucun droit), jamais confondues avec les boutons signés de l’équipe.
 * État : `bot-sessions` (30 min), écrit seulement quand un parcours attend une saisie.
 */
export const VISITOR_PER_MINUTE = 10
export const VISITOR_PER_DAY = 30
export const INSCRIPTIONS_PER_DAY = 3

type Ctx = { payload: Payload; msg: Inbound; deps: RemoteDeps; out: Transport; lang: BotLang; t: (typeof TEXT)['fr']; sessions: SessionStore; session: SessionState | null }
const btn = (text: string, data: string, short?: string): Button => ({ text, data, ...(short ? { short } : {}) })
const langPrefix = (l: BotLang) => (l === 'fr' ? '' : `/${l}`)
const senderKey = (m: Inbound) => `${m.channel}:${m.sender.telegramId ?? m.sender.phone ?? m.chatId}`

export async function visitor(payload: Payload, msg: Inbound, deps: RemoteDeps, out: Transport): Promise<string | null> {
  const sessions = deps.sessions ?? payloadSessions(payload)
  const reply = async (text: string, buttons?: Button[][]) => { await out.send(text, buttons); return text }
  const who = senderKey(msg)

  // Limites : 10 messages par minute, 30 par jour et par expéditeur ; au-delà un seul avis par jour, puis silence.
  const over = (await hit('bot-visiteur-minute', who, VISITOR_PER_MINUTE, 60).catch(() => 0)) > 0 || (await hit('bot-visiteur-jour', who, VISITOR_PER_DAY, 86_400).catch(() => 0)) > 0
  if (over) {
    if (msg.inGroup) return null
    const first = (await hit('bot-visiteur-avis', who, 1, 86_400).catch(() => 1)) === 0
    return first ? reply(TEXT[botLang(msg.lang, msg.text)].limite) : null
  }

  if (msg.inGroup) {
    // Groupe lié au canal : jamais de parcours ni de résultat, seulement un bouton vers la conversation privée.
    if (msg.callback || msg.voice || msg.photo || msg.document) return null
    const t = TEXT[botLang(msg.lang, msg.text)]
    return msg.botName ? reply(t.groupe, [[{ text: t.ouvrirBot, url: `https://t.me/${msg.botName}?start=chercher` }]]) : reply(t.groupeSansLien)
  }

  const session = await sessions.get(msg.channel, msg.chatId)
  const stored = session?.data.lang
  const lang: BotLang = msg.lang ? botLang(msg.lang) : stored === 'en' || stored === 'ar' || stored === 'fr' ? stored : botLang(undefined, msg.text)
  const c: Ctx = { payload, msg, deps, out, lang, t: TEXT[lang], sessions, session }

  // Vocal, photo, document : message fixe, sans téléchargement.
  if (!msg.callback && (msg.voice || msg.photo || msg.document)) return reply(c.t.fichiers)
  if (msg.callback) return onButton(c, msg.callback)

  const text = (msg.text ?? '').trim()
  const cmd = /^\/(\w+)(?:@\w+)?(?:\s+(\S+))?/.exec(text)
  if (cmd) {
    const [, name, arg] = cmd
    const n = name.toLowerCase()
    if (n === 'id' && msg.channel === 'telegram') return reply(`Votre identifiant Telegram : ${msg.sender.telegramId}\nMembre de l’équipe DALIL ? Donnez-le à l’administrateur.`)
    if (n === 'chercher' || (n === 'start' && arg === 'chercher')) return startSearch(c)
    if (n === 'inscrire' || (n === 'start' && arg === 'inscrire')) return startSignup(c)
    await sessions.clear(msg.channel, msg.chatId)
    return menu(c)
  }

  switch (session?.step) {
    case 'c:wilaya': {
      const w = findWilaya(text)
      if (!w) return reply(c.t.wilayaUnknown, [[btn(c.t.annuler, 'v:m')]])
      await sessions.clear(msg.channel, msg.chatId)
      return askRubrique(c, w, 0)
    }
    case 'i:nom': {
      const nom = validName(text)
      if (!nom) return reask(c, 'qNom', 'exNom')
      await save(c, 'i:activite', { nom })
      return askActivity(c, 0)
    }
    case 'i:activite': {
      const activite = validActivity(text)
      if (!activite) return reask(c, 'qActivite', 'exActivite', activityButtons(c, 0))
      const m = matchCategory(activite)
      await save(c, 'i:wilaya', { activite, ...(m ? { secteur: m.sector, categorie: m.category } : {}) })
      return askSignupWilaya(c)
    }
    case 'i:wilaya': {
      const w = findWilaya(text)
      if (!w) return reask(c, 'qWilaya', 'exWilaya', wilayaButtons(c, 'i'))
      await save(c, 'i:tel', { wilaya: w.code })
      return reply(`${c.t.qTel}\n${c.t.exTel}`, [[btn(c.t.annuler, 'v:m')]])
    }
    case 'i:tel': {
      const tel = normalizePhone(text)
      if (!tel) return reask(c, 'qTel', 'exTel')
      return finishSignup(c, tel)
    }
  }
  return menu(c)
}

function menu(c: Ctx) {
  const rows: Button[][] = [[btn(c.t.chercher, 'v:c', c.t.chercherShort)], [btn(c.t.inscrire, 'v:i', c.t.inscrireShort)], [{ text: c.t.site, url: `${SITE}${langPrefix(c.lang)}` }]]
  return send(c, c.t.menu, rows)
}

const send = async (c: Ctx, text: string, buttons?: Button[][]) => { await c.out.send(text, buttons); return text }

/** Même question reposée, avec un exemple. */
function reask(c: Ctx, q: keyof Ctx['t'], ex: keyof Ctx['t'], buttons?: Button[][]) {
  return send(c, `${c.t.invalide}\n${c.t[q]}\n${c.t[ex]}`, [...(buttons ?? []), [btn(c.t.annuler, 'v:m')]])
}

async function save(c: Ctx, step: string, add: Record<string, unknown>) {
  const data = { ...(c.session?.data ?? {}), lang: c.lang, ...add }
  await c.sessions.set(c.msg.channel, c.msg.chatId, { step, data })
  c.session = { step, data }
}

function wilayaButtons(c: Ctx, flow: 'c' | 'i'): Button[][] {
  const top = TOP_WILAYAS.map((code) => wilayaByCode(code)!).map((w) => btn(wilayaName(w, c.lang), `v:${flow}w:${w.code}`))
  const rows: Button[][] = []
  for (let i = 0; i < top.length; i += 2) rows.push(top.slice(i, i + 2))
  rows.push([btn(c.t.autre, `v:${flow}o`)])
  return rows
}

/** Rubriques par page : toutes sur Telegram ; 10 lignes au plus sur WhatsApp (liste interactive). */
function rubriquePage(c: Ctx, page: number, room: number, data: (idx: number) => string, more: (next: number) => string): Button[][] {
  const per = c.msg.channel === 'whatsapp' ? room : RUBRIQUES.length
  const pages = Math.ceil(RUBRIQUES.length / per)
  const p = page >= 0 && page < pages ? page : 0
  const rows = RUBRIQUES.slice(p * per, (p + 1) * per).map((r, i) => [btn(r.title, data(p * per + i))])
  if (pages > 1) rows.push([btn(c.t.plus, more((p + 1) % pages))])
  return rows
}

async function startSearch(c: Ctx) {
  await c.sessions.clear(c.msg.channel, c.msg.chatId)
  return send(c, c.t.wilaya, wilayaButtons(c, 'c'))
}

function askRubrique(c: Ctx, w: Wilaya, page: number) {
  return send(c, `${wilayaName(w, c.lang)} — ${c.t.rubrique}`, rubriquePage(c, page, 9, (i) => `v:cr:${w.code}:${i}`, (n) => `v:cp:${w.code}:${n}`))
}

async function startSignup(c: Ctx) {
  c.session = null
  await save(c, 'i:nom', {})
  return send(c, `${c.t.qNom}\n${c.t.exNom}`, [[btn(c.t.annuler, 'v:m')]])
}

const activityButtons = (c: Ctx, page: number) => rubriquePage(c, page, 8, (i) => `v:ia:${i}`, (n) => `v:ip:${n}`)
const askActivity = (c: Ctx, page: number) => send(c, `${c.t.qActivite}\n${c.t.exActivite}`, [...activityButtons(c, page), [btn(c.t.annuler, 'v:m')]])
const askSignupWilaya = (c: Ctx) => send(c, `${c.t.qWilaya}\n${c.t.exWilaya}`, [...wilayaButtons(c, 'i'), [btn(c.t.annuler, 'v:m')]])

async function onButton(c: Ctx, data: string) {
  const [, op, a, b] = data.split(':')
  const step = c.session?.step
  if (!data.startsWith('v:')) return menu(c)
  switch (op) {
    case 'c': return startSearch(c)
    case 'i': return startSignup(c)
    case 'cw': { const w = wilayaByCode(a); return w ? askRubrique(c, w, 0) : startSearch(c) }
    case 'co':
      await save(c, 'c:wilaya', {})
      return send(c, c.t.wilayaType, [[btn(c.t.annuler, 'v:m')]])
    case 'cp': { const w = wilayaByCode(a); return w ? askRubrique(c, w, Number(b)) : startSearch(c) }
    case 'cr': {
      const w = wilayaByCode(a)
      const r = RUBRIQUES[Number(b)]
      return w && r ? results(c, w, r) : startSearch(c)
    }
    case 'ia': {
      const r = RUBRIQUES[Number(a)]
      if (step !== 'i:activite' || !r) return menu(c)
      await save(c, 'i:wilaya', { activite: r.title, secteur: r.slug })
      return askSignupWilaya(c)
    }
    case 'ip': return step === 'i:activite' ? askActivity(c, Number(a)) : menu(c)
    case 'iw': {
      const w = wilayaByCode(a)
      if (step !== 'i:wilaya' || !w) return menu(c)
      await save(c, 'i:tel', { wilaya: w.code })
      return send(c, `${c.t.qTel}\n${c.t.exTel}`, [[btn(c.t.annuler, 'v:m')]])
    }
    case 'io': return step === 'i:wilaya' ? send(c, `${c.t.wilayaType}`, [[btn(c.t.annuler, 'v:m')]]) : menu(c)
    default:
      await c.sessions.clear(c.msg.channel, c.msg.chatId)
      return menu(c)
  }
}

/** 3 fiches publiées via l’action publique du registre (chercher_lieu, sinon rechercher). */
async function results(c: Ctx, w: Wilaya, r: { slug: string; title: string }) {
  const publicActions = c.deps.actionsFor({ kind: 'public' }).filter((x) => x.access === 'public' && x.readOnly)
  const a = resolveAction(publicActions, ['chercher_lieu', 'rechercher'])
  const more: Button[] = [{ text: c.t.autresResultats, url: `${SITE}${langPrefix(c.lang)}/recherche?${new URLSearchParams({ q: `${r.title} ${w.name}`, w: String(w.code) }).toString()}` }]
  const again = [btn(c.t.nouvelle, 'v:c')]
  if (!a) return send(c, c.t.aucun, [more, again])
  const input = a.name === 'chercher_lieu' ? { secteur: r.slug, wilaya: String(w.code), limite: 3 } : { texte: r.title, wilaya: String(w.code), rubrique: 'adresses', limite: 3 }
  const ctx: ActionContext = { principal: { kind: 'public' }, channel: c.msg.channel, actionId: c.deps.newActionId(), lang: c.lang }
  const items = listOf(await c.deps.runAction(a.name, fitInput(a, input), ctx)).slice(0, 3)
  const head = `${c.t.resultats} — ${r.title}, ${wilayaName(w, c.lang)}`
  if (!items.length) return send(c, `${head}\n\n${c.t.aucun}`, [more, again])
  const lines = items.map((it, i) => {
    const name = String(it.titre ?? it.title ?? it.name ?? it.nom ?? '—')
    const where = it.ville ?? it.city ?? it.wilaya
    const raw = String(it.url ?? it.path ?? '')
    const link = raw.startsWith('http') ? raw : raw ? `${SITE}${raw.startsWith('/') ? '' : '/'}${raw}` : ''
    return `${i + 1}. ${name}${where ? ` — ${String(where)}` : ''}${link ? `\n${link}` : ''}`
  })
  return send(c, `${head}\n\n${lines.join('\n\n')}`, [more, again])
}

/** Fin de l’inscription : brouillon côté serveur (hors registre public), équipe prévenue, lien de finalisation. */
async function finishSignup(c: Ctx, phone: string) {
  const d = (c.session?.data ?? {}) as { nom?: string; activite?: string; secteur?: string; categorie?: string; wilaya?: number }
  const w = d.wilaya ? wilayaByCode(d.wilaya) : null
  await c.sessions.clear(c.msg.channel, c.msg.chatId)
  if (!d.nom || !d.activite || !w) return startSignup(c)
  if ((await hit('bot-inscription', senderKey(c.msg), INSCRIPTIONS_PER_DAY, 86_400).catch(() => 0)) > 0) return send(c, c.t.quotaInscription, [[{ text: c.t.site, url: `${SITE}${langPrefix(c.lang)}` }]])
  const canal = c.msg.channel === 'telegram' ? 'Telegram' : 'WhatsApp'
  const note = [
    `Déclaré via le bot ${canal} le ${new Date().toISOString().slice(0, 10)} — rien n’est vérifié.`,
    `Activité déclarée : ${d.activite}${d.categorie ? '' : ' (catégorie à choisir)'}`,
    `Téléphone déclaré : ${phone}`,
    'Ville et adresse à compléter.',
  ].join('\n')
  const doc = (await c.payload.create({
    collection: 'places',
    draft: true,
    overrideAccess: true,
    context: { channel: c.msg.channel, botInscription: true },
    data: {
      name: d.nom,
      slug: `${slugify(`${d.nom} ${w.name}`) || 'lieu'}-${Date.now().toString(36)}`,
      ...(d.secteur ? { sector: d.secteur } : {}),
      ...(d.categorie ? { category: d.categorie } : {}),
      wilaya: String(w.code),
      phone,
      verification: 'spotted',
      internalNote: note,
      source: { provider: 'pro' },
      _status: 'draft',
    } as never,
  })) as unknown as { id: number }
  const ref = `places-${doc.id}`
  const buttons = [signCallback('p', ref), signCallback('r', ref)].map((data, i) => (data ? { text: i ? 'Rejeter' : 'Publier', data } : null)).filter((x): x is { text: string; data: string } => !!x)
  await notifyStaff(
    [`Nouvelle inscription via le bot ${canal} (brouillon ${ref}) :`, `Nom : ${d.nom}`, `Activité : ${d.activite}`, `Wilaya : ${w.name}`, `Téléphone : ${phone}`, `${SITE}/admin/collections/places/${doc.id}`].join('\n'),
    buttons.length ? { buttons: [buttons] } : undefined,
  )
  const link = signingSecret() ? finalizeLink({ collection: 'places', id: doc.id, phone }, c.lang) : null
  return send(c, link ? `${c.t.merci}\n\n${c.t.finaliser}\n${link}` : `${c.t.merci}\n${c.t.sansLien}`, [[{ text: c.t.site, url: `${SITE}${langPrefix(c.lang)}` }]])
}
