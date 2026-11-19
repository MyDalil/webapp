import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin, isAdminField, isAdminUser, isAdvisorUser, isPatronUser, isStaffUser } from '@/platform/access'
import { SITE, TEAM, esc, layout, send } from '@/platform/mail'

const resetUrl = (token: string) => `${SITE}/admin/reset/${token}`

/** Champs dont le changement est réservé à un patron/admin et signalé à l’équipe. */
const SENSITIVE = ['role', 'telegramId', 'whatsappPhone'] as const
const ROLE_LABEL: Record<string, string> = { patron: 'patron', admin: 'administrateur', editor: 'rédacteur', conseiller: 'conseiller' }

/** Le changement donne ou retire le rôle patron. */
export const touchesPatron = (data: { role?: unknown }, originalDoc?: { role?: unknown } | null) =>
  data.role === 'patron' ? originalDoc?.role !== 'patron' : originalDoc?.role === 'patron' && data.role !== undefined && data.role !== 'patron'

type UserDoc = { name?: string | null; email?: string | null; role?: string | null; telegramId?: string | null; whatsappPhone?: string | null }

/** Message à l’équipe pour un changement de compte (null si rien de sensible n’a changé). Logique pure, testée. */
export function teamNotice(author: string, op: 'create' | 'update' | 'delete', doc: UserDoc, previous?: UserDoc | null): string | null {
  const nom = doc.name || doc.email || 'sans nom'
  if (op === 'create') return `${author} a créé le compte ${nom} (rôle : ${ROLE_LABEL[String(doc.role)] ?? doc.role}).`
  if (op === 'delete') return `${author} a supprimé le compte ${nom}.`
  const changes: string[] = []
  if (previous && doc.role !== previous.role) changes.push(`rôle ${ROLE_LABEL[String(previous.role)] ?? previous.role} → ${ROLE_LABEL[String(doc.role)] ?? doc.role}`)
  if (previous && (doc.telegramId ?? '') !== (previous.telegramId ?? '')) changes.push(doc.telegramId ? 'identifiant Telegram modifié' : 'identifiant Telegram retiré')
  if (previous && (doc.whatsappPhone ?? '') !== (previous.whatsappPhone ?? '')) changes.push(doc.whatsappPhone ? 'numéro WhatsApp modifié' : 'numéro WhatsApp retiré')
  if (previous && (doc.email ?? '') !== (previous.email ?? '')) changes.push('email modifié')
  return changes.length ? `${author} a modifié le compte ${nom} : ${changes.join(', ')}.` : null
}

const authorOf = (user: unknown) => {
  const u = user as { name?: string; email?: string } | null
  return u ? u.name || u.email || 'Un membre de l’équipe' : 'Le système'
}

/** Prévient les patrons et administrateurs (Telegram). Chargé à la demande : la CLI Payload charge aussi ce fichier. */
async function tellTeam(text: string | null) {
  if (!text) return
  try {
    const { notifyStaff } = await import('@/platform/telegram/notify')
    await notifyStaff(text)
  } catch {
    /* hors contexte Next, ou Telegram indisponible : l’action n’échoue jamais pour une notification */
  }
}

/** Le tout premier compte devient administrateur (en ligne : seulement avec l’email DALIL_ADMIN_EMAIL) ; on mémorise les changements sensibles pour prévenir le titulaire. */
const before: CollectionBeforeChangeHook = async ({ data, operation, req, originalDoc, context }) => {
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
    if (totalDocs === 0) {
      // En ligne (Vercel), le premier compte doit porter l’email prévu : une base vide ne donne pas l’administration au premier venu.
      // Sans variable : l’adresse de l’équipe (salam@mydalil.com, boîte redirigée chez Gandi).
      const expected = (process.env.DALIL_ADMIN_EMAIL || TEAM).trim().toLowerCase()
      if (process.env.VERCEL && String(data.email ?? '').trim().toLowerCase() !== expected)
        throw new APIError(`Premier compte : utilisez l’adresse ${expected}.`, 403)
      return { ...data, role: 'admin' }
    }
    context.invite = true
  }
  // Le rôle patron ne se donne et ne se retire que par un patron. Un administrateur ne peut jamais le donner.
  // Seul un traitement sans compte (script de reprise, migration) peut nommer le premier patron.
  if (touchesPatron(data, originalDoc) && req.user && !isPatronUser(req.user)) throw new APIError('Seul le patron peut donner ou retirer le rôle patron.', 403)
  // Champs sensibles : création, rôle, Telegram, WhatsApp réservés à un patron ou un administrateur (en plus de l’accès aux champs).
  if (req.user && !isAdminUser(req.user) && (operation === 'create' || SENSITIVE.some((k) => k in data && (data[k] ?? null) !== (originalDoc?.[k] ?? null))))
    throw new APIError('Réservé à un patron ou un administrateur.', 403)
  if (operation === 'update') {
    if (data.password) context.passwordChanged = true
    if (data.email && originalDoc?.email && data.email !== originalDoc.email) context.previousEmail = originalDoc.email
  }
  return data
}

const after: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  await tellTeam(teamNotice(authorOf(req.user), operation === 'create' ? 'create' : 'update', doc, previousDoc))
  // Invitation d’un nouveau membre : il choisit lui-même son mot de passe (lien valable 1 h).
  if (context.invite) {
    context.invite = false // la génération du jeton met à jour le compte : éviter de relancer l’invitation
    const token = await req.payload.forgotPassword({ collection: 'users', data: { email: doc.email }, disableEmail: true, req })
    if (token) {
      await send(
        doc.email,
        'Votre accès à l’administration DALIL',
        layout(
          `Bienvenue dans l’équipe DALIL, ${esc(doc.name)}.`,
          `<p>${esc((req.user as { name?: string } | null)?.name ?? 'Un administrateur')} vous a créé un accès à l’administration de DALIL (rôle : ${doc.role === 'patron' ? 'patron' : doc.role === 'admin' ? 'administrateur' : doc.role === 'conseiller' ? 'conseiller' : 'rédacteur'}).</p><p>Choisissez votre mot de passe avec le bouton ci-dessous. Le lien est valable une heure ; passé ce délai, utilisez « Mot de passe oublié » sur la page de connexion.</p>`,
          { label: 'Choisir mon mot de passe', href: resetUrl(token) },
        ),
      )
    }
  }
  if (context.passwordChanged) {
    context.passwordChanged = false
    await send(
      doc.email,
      'Votre mot de passe DALIL a été modifié',
      layout(
        'Votre mot de passe a été modifié.',
        `<p>Le mot de passe de votre accès à l’administration DALIL vient d’être changé.</p><p><b>Ce n’est pas vous ?</b> Réinitialisez-le immédiatement depuis la page de connexion (« Mot de passe oublié ») et prévenez un administrateur.</p>`,
        { label: 'Page de connexion', href: `${SITE}/admin/login` },
      ),
    )
  }
  if (context.previousEmail) {
    const previous = String(context.previousEmail)
    context.previousEmail = undefined
    await send(
      previous,
      'L’email de votre accès DALIL a été modifié',
      layout(
        'L’adresse de votre accès a changé.',
        `<p>L’email de connexion de votre accès à l’administration DALIL a été remplacé par ${esc(doc.email)}.</p><p><b>Ce n’est pas vous ?</b> Prévenez immédiatement un administrateur en répondant à cet email.</p>`,
      ),
    )
  }
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await tellTeam(teamNotice(authorOf(req.user), 'delete', doc))
  return doc
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Membre de l’équipe', plural: 'Équipe' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'], group: 'Administration' },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
    forgotPassword: {
      generateEmailSubject: () => 'Réinitialiser votre mot de passe DALIL',
      generateEmailHTML: (args) =>
        layout(
          'Réinitialiser votre mot de passe.',
          '<p>Une réinitialisation du mot de passe de votre accès à l’administration DALIL a été demandée.</p><p>Le lien est valable une heure. Si vous n’êtes pas à l’origine de la demande, ignorez cet email : votre mot de passe actuel reste valable.</p>',
          { label: 'Choisir un nouveau mot de passe', href: resetUrl(String(args?.token ?? '')) },
        ),
    },
  },
  hooks: { beforeChange: [before], afterChange: [after], afterDelete: [afterDelete] },
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: ({ req: { user } }) => (isAdminUser(user) ? true : isStaffUser(user) || isAdvisorUser(user) ? { id: { equals: user?.id } } : false),
    update: ({ req: { user } }) => (isAdminUser(user) ? true : isStaffUser(user) || isAdvisorUser(user) ? { id: { equals: user?.id } } : false),
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true },
    {
      name: 'telegramId',
      type: 'text',
      label: 'Identifiant Telegram',
      access: { update: isAdminField, create: isAdminField },
      admin: { description: 'Nombre fourni par Telegram (pas le nom d’utilisateur). Autorise ce compte à parler à l’agent CEO.' },
      validate: (v: unknown) => (!v || /^\d{4,15}$/.test(String(v)) ? true : 'Uniquement des chiffres.'),
    },
    {
      name: 'whatsappPhone',
      type: 'text',
      label: 'Numéro WhatsApp',
      unique: true,
      access: { read: isAdminField, update: isAdminField, create: isAdminField },
      admin: { description: 'Format international E.164, ex. +213551234567. Autorise ce compte à écrire au bot WhatsApp.' },
      validate: (v: unknown) => (!v || /^\+[1-9]\d{6,14}$/.test(String(v)) ? true : 'Format E.164 attendu : + suivi de 7 à 15 chiffres.'),
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rôle',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      access: { update: isAdminField, create: isAdminField },
      options: [
        { label: 'Patron — tous les droits, publie sur le canal Telegram, gère Vie musulmane', value: 'patron' },
        { label: 'Administrateur — publie et gère tout', value: 'admin' },
        { label: 'Rédacteur — prépare, ne publie pas', value: 'editor' },
        { label: 'Conseiller — traite les demandes d’accompagnement, rien d’autre', value: 'conseiller' },
      ],
    },
  ],
}
