import 'server-only'
import { ActionError } from '@/platform/actions'
import { createLocalReq, type Payload } from 'payload'
import type { ActionContext, ActionDef, Channel, Principal, StaffRole } from '@/platform/actions/types'
import { readImage } from '@/platform/ai/vision'
import { getControls } from '@/platform/controls/Controls'
import { MAX_CSV_BYTES, MAX_CSV_LABEL } from '@/platform/ops/csv'
import { SITE } from '@/platform/mail'
import { hit } from '@/platform/security/rateLimit'
import { cleanImage } from '@/platform/storage/images'
import { confirmRef, readCallback, readConfirmRef, signCallback, SIGNING_OFF, type CallbackOp } from '@/platform/telegram/callback'
import { transcribe, transcriptionConfigured } from './media'
import { AIDE_EQUIPE, COMMAND_ACTIONS, fitInput, formatOutcome, isPublisher, parseRemote, resolveAction, textInput } from './parse'
import type { SessionStore } from './sessions'
import { understand } from './understand'
import { visitor } from './visitor'

/**
 * Cœur commun de la télécommande DALIL (Telegram, WhatsApp). Canal-agnostique : l’adaptateur fournit le message
 * entrant et la façon de répondre ; le registre (injecté par la route, jamais importé ici) fournit les actions.
 * Aucune logique métier : identification du compte, compréhension, appel d’une action, réponse.
 */
export type RemoteDeps = {
  actionsFor: (p: Principal) => ActionDef[]
  runAction: (name: string, input: unknown, ctx: ActionContext) => Promise<unknown>
  newActionId: () => string
  /** État des parcours visiteurs ; défaut : collection `bot-sessions` (tests : stockage en mémoire). */
  sessions?: SessionStore
}
/** Bouton : `data` (rappel) ou `url` (lien) ; `short` = libellé court (WhatsApp, 20 caractères). */
export type Button = { text: string; data?: string; url?: string; short?: string }
export type Transport = { send: (text: string, buttons?: Button[][]) => Promise<void> }
export type Attachment = { load: () => Promise<{ bytes: Uint8Array; mime: string } | null>; name?: string }
export type RemoteChannel = Extract<Channel, 'telegram' | 'whatsapp'>
export type Inbound = {
  channel: RemoteChannel
  /** Conversation (identifiant de chat Telegram ou numéro WhatsApp). */
  chatId: string
  sender: { telegramId?: string; phone?: string }
  text?: string
  voice?: Attachment
  photo?: Attachment
  document?: Attachment
  /** Clic sur un bouton : donnée signée. */
  callback?: string
  /** Groupe de discussion public : lecture seule, quel que soit l’expéditeur. */
  inGroup?: boolean
  botName?: string
  /** Langue de l’appareil (Telegram language_code), pour le bot visiteur. */
  lang?: string
}

type UserRow = { id: number; name?: string | null; role?: string | null }
const STAFF: readonly StaffRole[] = ['patron', 'admin', 'editor', 'conseiller']
const LABEL: Record<RemoteChannel, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp' }
/** Seuls les refus métier sont montrés ; une erreur technique (SQL…) n’est jamais renvoyée au correspondant. */
const errText = (e: unknown) => {
  if (e instanceof ActionError) return e.message.slice(0, 300)
  console.error('[canal] erreur', e)
  return 'Action non effectuée. L’équipe est prévenue.'
}

/** Actions d’administration qui écrivent : jamais lancées directement depuis un canal, seulement après un clic signé. */
const needsClick = (a: ActionDef) => a.access === 'admin' && !a.readOnly
// Table des confirmations signées (CONFIRM, confirmRef, readConfirmRef) : socle `@/platform/telegram/callback`, partagée avec `pros`.
export { confirmRef, readConfirmRef }

/** Compte équipe relié à cet expéditeur (« Identifiant Telegram » ou « Numéro WhatsApp » dans /admin). */
export async function identify(payload: Payload, sender: Inbound['sender']): Promise<{ principal: Principal; user: UserRow | null }> {
  const where = sender.telegramId ? { telegramId: { equals: sender.telegramId } } : sender.phone ? { whatsappPhone: { equals: sender.phone } } : null
  if (!where) return { principal: { kind: 'public' }, user: null }
  // `whatsappPhone` : champ ajouté à Users par le lot C1 (cast tant que payload-types ne le connaît pas).
  const r = await payload.find({ collection: 'users', where: where as never, limit: 1, depth: 0, overrideAccess: true })
  const u = r.docs[0] as unknown as UserRow | undefined
  if (!u || !(STAFF as readonly string[]).includes(String(u.role))) return { principal: { kind: 'public' }, user: null }
  return { principal: { kind: 'staff', userId: u.id, role: u.role as StaffRole, name: u.name || `Compte ${u.id}` }, user: u }
}

/** Le canal est-il coupé (Commandes : tout couper, ou Telegram désactivé) ? */
async function channelOff(payload: Payload, channel: RemoteChannel) {
  const c = await getControls(payload).catch(() => null)
  if (!c) return false
  return c.killSwitch === 'cut' || (channel === 'telegram' && c.telegramEnabled === false)
}

export const RETRY_TEXT = 'Erreur, réessayez.'

/**
 * Point d’entrée des canaux. Une panne imprévue (base, réseau…) répond « Erreur, réessayez. » à l’expéditeur
 * puis remonte l’erreur : la route l’enregistre et libère sa clé d’anti-doublon pour qu’un nouvel envoi passe.
 */
export async function handleInbound(payload: Payload, msg: Inbound, deps: RemoteDeps, out: Transport): Promise<string | null> {
  try {
    return await inbound(payload, msg, deps, out)
  } catch (e) {
    await out.send(RETRY_TEXT).catch(() => {})
    throw e
  }
}

async function inbound(payload: Payload, msg: Inbound, deps: RemoteDeps, out: Transport): Promise<string | null> {
  if (await channelOff(payload, msg.channel)) return null
  const who = msg.inGroup ? { principal: { kind: 'public' } as Principal, user: null } : await identify(payload, msg.sender)
  // Visiteur (et tout message de groupe) : distributeur fermé, sans IA (remote/visitor.ts).
  if (who.principal.kind === 'public') return visitor(payload, msg, deps, out)
  const principal = who.principal
  const { user } = who
  const reply = async (text: string, buttons?: Button[][]) => { await out.send(text, buttons); return text }
  const ctx = (actionId = deps.newActionId()): ActionContext => ({ principal, channel: msg.channel, actionId, lang: 'fr' })
  const actions = () => deps.actionsFor(principal)

  /** Exécute une action ; une écriture répond avec le résumé et les boutons signés. */
  const run = async (a: ActionDef, input: Record<string, unknown>) => {
    if (needsClick(a)) {
      if (principal.kind !== 'staff' || !isPublisher(principal)) return reply('Réservé aux comptes patron et admin.')
      const ref = confirmRef(a.name, input)
      const data = ref ? signCallback('x', ref) : null
      if (data) return reply(`Confirmer : ${a.title} (${ref}) ?`, [[{ text: 'Confirmer', data }]])
      return reply(ref ? SIGNING_OFF : `« ${a.title} » se fait dans /admin : ${SITE}/admin`)
    }
    const c = ctx()
    try {
      const result = await deps.runAction(a.name, input, c)
      if (a.readOnly) return reply(formatOutcome(result))
      const ref = docRef(result) ?? c.actionId
      return reply(`Brouillon : ${a.title}\n${formatOutcome(result)}\n\nRéf. ${ref}`, docRef(result) ? draftButtons(ref, principal) : undefined)
    } catch (e) {
      return reply(`Refusé : ${errText(e)}`)
    }
  }

  if (msg.callback) return onClick(payload, msg, principal, user, deps, ctx, reply)

  // Vocal → texte, puis traitement comme un message écrit.
  let text = msg.text?.trim() ?? ''
  if (msg.voice) {
    if (!transcriptionConfigured()) return reply('Vocal non disponible, écrivez votre message.')
    const audio = await msg.voice.load()
    const heard = audio ? await transcribe(audio.bytes, audio.mime) : null
    if (!heard) return reply('Vocal non compris, écrivez votre message.')
    text = heard
    if (principal.kind === 'staff') await out.send(`Compris : « ${heard.slice(0, 500)} »`)
  }

  if (msg.photo) {
    return photoDraft(payload, msg, principal, text, actions(), run, reply)
  }

  const cmd = parseRemote(text, msg.botName)
  // Compte équipe.
  switch (cmd.kind) {
    case 'start':
    case 'aide': return reply(`Salam ${principal.name}.\n${AIDE_EQUIPE}`)
    case 'erreur': return reply(cmd.message)
    case 'action': {
      const a = resolveAction(actions(), COMMAND_ACTIONS[cmd.cmd])
      if (!a) return reply(`Action « ${cmd.cmd} » indisponible pour votre compte.`)
      if (cmd.cmd === 'csv') {
        const f = msg.document ? await msg.document.load() : null
        if (!f) return reply('Joignez le fichier CSV au message /csv.')
        if (f.bytes.length > MAX_CSV_BYTES) return reply(`Fichier trop lourd (${MAX_CSV_LABEL} maximum).`)
        const depuis = /\bdepuis\s+(\d+)/i.exec(cmd.args)
        const input = fitInput(a, { collection: 'places', csv: new TextDecoder().decode(f.bytes), confirmer: /\bconfirm/i.test(cmd.args), depuis: depuis ? Number(depuis[1]) : undefined })
        return reply(await csvImport(deps, a, input, ctx))
      }
      return run(a, textInput(a, cmd.args))
    }
    case 'publier': {
      if (!isPublisher(principal)) return reply('Publication réservée aux comptes patron et admin.')
      const data = signCallback('p', cmd.ref)
      return data ? reply(`Publier ${cmd.ref} ? Confirmez par le bouton.`, [[{ text: 'Publier', data }]]) : reply(SIGNING_OFF)
    }
    case 'rejeter':
    case 'corriger': {
      const a = resolveAction(actions(), COMMAND_ACTIONS[cmd.kind])
      if (!a) return reply(`Action « ${cmd.kind} » indisponible pour votre compte.`)
      if (cmd.kind === 'rejeter') return run(a, fitInput(a, { ...refInput(cmd.ref), motif: cmd.motif }))
      const ref = refInput(cmd.ref)
      if (!ref.collection) return reply('Référence attendue au format collection-numéro, par exemple places-12.')
      const choice = await understand(`Fiche ${ref.collection} n° ${ref.id}. Correction demandée : ${cmd.text}. Remplis « champs » avec les seuls champs à corriger.`, [a])
      if (!choice || choice.action !== a.name) return reply(`Correction non comprise. Corrigez dans /admin : ${SITE}/admin/collections/${ref.collection}/${ref.id}`)
      return run(a, { ...choice.input, collection: ref.collection, id: ref.id })
    }
    case 'defi': return defi(payload, msg, principal, user, cmd.wilaya, cmd.theme, actions(), run, reply)
    case 'texte': {
      // L’IA ne voit jamais les actions d’administration qui écrivent : elle ne peut que les proposer via un bouton.
      const choice = await understand(cmd.text, actions().filter((x) => !needsClick(x)))
      if (!choice) return reply('IA indisponible : utilisez les commandes. Tapez /aide.')
      if (choice.action === null) return reply(choice.reply)
      const a = actions().find((x) => x.name === choice.action)!
      return run(a, choice.input)
    }
  }
}

type CsvLot = { mode?: string; lignes?: number; lot?: { debut: number; fin: number; taille?: number }; suite?: number | null; aCreer?: unknown[]; doublons?: unknown[]; erreurs?: unknown[]; crees?: unknown[]; echecs?: unknown[] }
/** Lots enchaînés au plus par une commande /csv confirmée (150 lignes par lot) ; au-delà, reprise par « /csv confirmer depuis N ». */
export const CSV_MAX_LOTS = 15

/**
 * Import CSV depuis un canal. Simulation : un seul lot, avec le nombre total de lignes et de lots.
 * Confirmé : les lots s’enchaînent (`depuis = suite`) jusqu’à la fin du fichier ou CSV_MAX_LOTS, puis un rapport cumulé.
 */
export async function csvImport(deps: RemoteDeps, a: ActionDef, input: Record<string, unknown>, ctx: () => ActionContext): Promise<string> {
  const n = (v?: unknown[]) => v?.length ?? 0
  const sum = { lots: 0, aCreer: 0, crees: 0, doublons: 0, erreurs: 0, echecs: 0 }
  let first: CsvLot | null = null
  let last: CsvLot | null = null
  let depuis = typeof input.depuis === 'number' ? input.depuis : 0
  try {
    for (;;) {
      const r = (await deps.runAction(a.name, depuis ? { ...input, depuis } : input, ctx())) as CsvLot
      first ??= r
      last = r
      sum.lots++
      sum.aCreer += n(r.aCreer)
      sum.crees += n(r.crees)
      sum.doublons += n(r.doublons)
      sum.erreurs += n(r.erreurs)
      sum.echecs += n(r.echecs)
      if (r.mode !== 'confirme' || r.suite == null || sum.lots >= CSV_MAX_LOTS) break
      depuis = r.suite
    }
  } catch (e) {
    if (!last) return `Refusé : ${errText(e)}`
    return `${csvReport(first!, last, sum)}\n\nInterrompu : ${errText(e)}\nReprendre : /csv confirmer depuis ${depuis} (même fichier).`
  }
  return csvReport(first!, last!, sum)
}

function csvReport(first: CsvLot, last: CsvLot, s: { lots: number; aCreer: number; crees: number; doublons: number; erreurs: number; echecs: number }): string {
  const total = last.lignes ?? 0
  const debut = (first.lot?.debut ?? 0) + 1
  const fin = last.lot?.fin ?? total
  const taille = last.lot?.taille || 150
  if (last.mode !== 'confirme') {
    const lots = Math.max(1, Math.ceil(total / taille))
    return [
      `Simulation, rien n’est écrit. Lignes ${debut} à ${fin} sur ${total} (lot 1 sur ${lots}).`,
      `À créer : ${s.aCreer} · Doublons : ${s.doublons} · Erreurs : ${s.erreurs}`,
      `Pour créer les brouillons (${lots} lot${lots > 1 ? 's' : ''}) : renvoyez le fichier avec « /csv confirmer ».`,
    ].join('\n')
  }
  const lines = [
    `Import en brouillon : lignes ${debut} à ${fin} sur ${total} (${s.lots} lot${s.lots > 1 ? 's' : ''}).`,
    `Créées : ${s.crees} · Doublons : ${s.doublons} · Erreurs : ${s.erreurs} · Échecs : ${s.echecs}`,
    'Rien n’est publié : relisez les brouillons dans /admin.',
  ]
  if (last.suite != null) lines.push(`Arrêt après ${s.lots} lots. Reprendre : /csv confirmer depuis ${last.suite} (même fichier).`)
  return lines.join('\n')
}

/** Référence d’un bouton ou d’une commande : numéro de document ou identifiant d’action. */
export function refInput(ref: string): Record<string, unknown> {
  const m = /^([a-z]+)-(\d+)$/.exec(ref)
  if (m) return { collection: m[1], id: Number(m[2]) }
  return /^\d+$/.test(ref) ? { id: Number(ref) } : { actionId: ref }
}

/** Référence « collection-numéro » d’un document créé ou modifié (ex. places-12), lue dans le résultat de l’action. */
export function docRef(result: unknown): string | null {
  const r = result as { collection?: unknown; id?: unknown } | null
  return r && typeof r.collection === 'string' && /^[a-z]+$/.test(r.collection) && Number.isInteger(r.id) ? `${r.collection}-${r.id}` : null
}

function draftButtons(actionId: string, principal: Principal): Button[][] | undefined {
  const row = (['p', 'c', 'r'] as CallbackOp[])
    .filter((op) => op !== 'p' || isPublisher(principal))
    .map((op) => ({ op, data: signCallback(op, actionId) }))
    .filter((b): b is { op: CallbackOp; data: string } => Boolean(b.data))
    .map((b) => ({ text: b.op === 'p' ? 'Publier' : b.op === 'c' ? 'Corriger' : 'Rejeter', data: b.data }))
  return row.length ? [row] : undefined
}

type Reply = (text: string, buttons?: Button[][]) => Promise<string>

async function onClick(payload: Payload, msg: Inbound, principal: Principal, user: UserRow | null, deps: RemoteDeps, ctx: (id?: string) => ActionContext, reply: Reply) {
  const cb = readCallback(msg.callback)
  if (!cb.ok) return reply(cb.reason === 'expire' ? 'Bouton expiré.' : 'Bouton invalide.')
  if (principal.kind !== 'staff' || !user) return reply('Réservé à l’équipe DALIL.')
  if ((cb.op === 'p' || cb.op === 't') && !isPublisher(principal)) return reply('Publication réservée aux comptes patron et admin.')
  if (cb.op === 'c') return reply(`Envoyez la correction :\n/corriger ${cb.ref} votre correction`)
  // Publier : la fiche ne doit pas avoir changé depuis l’émission du bouton.
  const confirmed = cb.op === 'x' ? readConfirmRef(cb.ref) : null
  const target = cb.op === 'p' ? refInput(cb.ref) : confirmed?.name === 'publier_fiche' ? confirmed.input : null
  if (target && typeof target.collection === 'string' && Number.isInteger(target.id)) {
    const changed = await changedSince(payload, target.collection, target.id as number, cb.at)
    if (changed === 'absent') return reply('Fiche introuvable.')
    if (changed) return reply('Fiche modifiée depuis : rouvrez-la.')
  }
  // Usage unique : la signature est consommée au premier clic valide (anti-rejeu, 7 jours).
  if ((await hit('remote-click', cb.sig, 1, 7 * 24 * 3600 + 300).catch(() => 1)) > 0) return reply('Déjà utilisé.')
  if (cb.op === 't') {
    // Défi wilaya : la publication passe par la garde du canal (Saïd seul) et son envoi existant.
    try {
      const req = await createLocalReq({ user: { ...user, collection: 'users' } as never, context: { channel: msg.channel } }, payload)
      await payload.update({ collection: 'telegram-posts', id: Number(cb.ref), data: { status: 'scheduled' } as never, req, overrideAccess: false, depth: 0 })
      return reply(`Publication #${cb.ref} programmée : envoi sur le canal en cours.`)
    } catch (e) {
      return reply(`Refusé : ${errText(e)}`)
    }
  }
  const actions = deps.actionsFor(principal)
  if (cb.op === 'x') {
    const c = readConfirmRef(cb.ref)
    const def = c ? actions.find((x) => x.name === c.name) : undefined
    if (!c || !def) return reply('Bouton expiré ou action indisponible.')
    try {
      const result = await deps.runAction(def.name, fitInput(def, c.input), { ...ctx(), confirmed: true })
      return reply(`Fait : ${def.title} (${cb.ref}).\n${formatOutcome(result)}`)
    } catch (e) {
      return reply(`Refusé : ${errText(e)}`)
    }
  }
  const a = resolveAction(actions, cb.op === 'p' ? COMMAND_ACTIONS.publier : COMMAND_ACTIONS.rejeter)
  if (!a) return reply(`Action « ${cb.op === 'p' ? 'publier' : 'rejeter'} » indisponible pour votre compte.`)
  try {
    const result = await deps.runAction(a.name, fitInput(a, { ...refInput(cb.ref), ...(cb.op === 'r' ? { motif: `Rejeté depuis ${LABEL[msg.channel]} par ${principal.name}` } : {}) }), { ...ctx(), confirmed: true })
    return reply(`${cb.op === 'p' ? 'Publié' : 'Rejeté'} (${cb.ref}).\n${formatOutcome(result)}`)
  } catch (e) {
    return reply(`Refusé : ${errText(e)}`)
  }
}

/** La fiche a-t-elle été modifiée après l’émission du bouton (horodatage en secondes, 2 s de tolérance) ? */
export async function changedSince(payload: Payload, collection: string, id: number, at: number): Promise<boolean | 'absent'> {
  try {
    const doc = (await payload.findByID({ collection: collection as never, id, depth: 0, draft: true, overrideAccess: true })) as unknown as { updatedAt?: string } | null
    if (!doc) return 'absent'
    const t = doc.updatedAt ? Date.parse(doc.updatedAt) : NaN
    return Number.isFinite(t) && t > (at + 2) * 1000
  } catch {
    return 'absent'
  }
}

const PHOTO_PROMPT = [
  'Photo envoyée à DALIL (devanture, carte de visite, panneau). Recopie seulement ce qui est lisible.',
  'Réponds uniquement en JSON : {"nom": …, "adresse": …, "telephone": …, "horaires": …}.',
  'Un champ illisible ou absent vaut null. N’invente rien, ne complète rien.',
].join(' ')

async function photoDraft(payload: Payload, msg: Inbound, principal: Extract<Principal, { kind: 'staff' }>, caption: string, actions: ActionDef[], run: (a: ActionDef, i: Record<string, unknown>) => Promise<string>, reply: Reply) {
  const file = await msg.photo!.load()
  if (!file) return reply('Photo non reçue, renvoyez-la.')
  const clean = cleanImage(Buffer.from(file.bytes))
  if ('error' in clean) return reply(clean.error)
  let mediaId: number | null = null
  try {
    const m = await payload.create({ collection: 'media', overrideAccess: true, data: { alt: `Photo reçue par ${LABEL[msg.channel]} (${principal.name}) — à contrôler`, moderation: 'to-check' } as never, file: { data: clean.data, mimetype: clean.mimetype, name: `${crypto.randomUUID()}.${clean.ext}`, size: clean.data.length } })
    mediaId = m.id as number
  } catch (e) {
    return reply(`Photo non enregistrée : ${errText(e)}`)
  }
  const raw = await readImage(new Uint8Array(clean.data), clean.mimetype, PHOTO_PROMPT)
  const info = parseInfo(raw)
  const draft = resolveAction(actions, COMMAND_ACTIONS.brouillon)
  if (!info && !caption) return reply(`Photo enregistrée (n° ${mediaId}, à contrôler). ${raw === null ? 'Lecture automatique indisponible' : 'Rien de lisible'} : envoyez le nom et l’adresse en texte.`)
  if (!draft) return reply(`Photo enregistrée (n° ${mediaId}, à contrôler). Création de brouillon indisponible pour votre compte.`)
  const lines = [info?.nom && `Nom : ${info.nom}`, info?.adresse && `Adresse : ${info.adresse}`, info?.telephone && `Téléphone : ${info.telephone}`, info?.horaires && `Horaires : ${info.horaires}`, caption && `Note : ${caption}`].filter(Boolean).join('\n')
  return run(draft, textInput(draft, lines, { nom: info?.nom, name: info?.nom, adresse: info?.adresse, address: info?.adresse, telephone: info?.telephone, phone: info?.telephone, horaires: info?.horaires, photo: mediaId, mediaId, media: mediaId }))
}

type PhotoInfo = { nom?: string; adresse?: string; telephone?: string; horaires?: string }
function parseInfo(raw: string | null): PhotoInfo | null {
  const m = raw?.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>
    const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : undefined)
    const out = { nom: s(j.nom), adresse: s(j.adresse), telephone: s(j.telephone), horaires: s(j.horaires) }
    return Object.values(out).some(Boolean) ? out : null
  } catch {
    return null
  }
}

async function defi(payload: Payload, msg: Inbound, principal: Principal, user: UserRow | null, wilaya: string, theme: string, actions: ActionDef[], run: (a: ActionDef, i: Record<string, unknown>) => Promise<string>, reply: Reply) {
  if (!isPublisher(principal) || !user) return reply('Défi réservé aux comptes patron et admin.')
  const a = resolveAction(actions, ['preparer_defi', 'defi'])
  if (a) return run(a, fitInput(a, { wilaya, theme, theme_defi: theme }))
  // Sans action dédiée : brouillon dans les publications du canal (module communication), publié après clic.
  const text = [`Défi DALIL — ${wilaya}`, `Thème : ${theme}`, '', `Vous connaissez une bonne adresse à ${wilaya} ? Proposez-la sur mydalil.com : l’équipe la vérifie avant publication.`].join('\n')
  try {
    const req = await createLocalReq({ user: { ...user, collection: 'users' } as never, context: { channel: msg.channel } }, payload)
    const post = await payload.create({ collection: 'telegram-posts', data: { title: `Défi ${wilaya} — ${theme}`.slice(0, 120), status: 'draft', text } as never, req, overrideAccess: false, depth: 0 })
    const data = signCallback('t', String(post.id))
    return reply(`Brouillon du défi (publication #${post.id}) :\n\n${text}\n\nModifiable dans /admin avant publication.`, data ? [[{ text: 'Publier', data }]] : undefined)
  } catch (e) {
    return reply(`Refusé : ${errText(e)}`)
  }
}
