import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { isAdmin, isAdminField } from '@/platform/access'
import { SITE, esc, layout, send } from '@/platform/mail'

const resetUrl = (token: string) => `${SITE}/admin/reset/${token}`

/** Le tout premier compte devient administrateur ; on mémorise les changements sensibles pour prévenir le titulaire. */
const before: CollectionBeforeChangeHook = async ({ data, operation, req, originalDoc, context }) => {
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
    if (totalDocs === 0) return { ...data, role: 'admin' }
    context.invite = true
  }
  if (operation === 'update') {
    if (data.password) context.passwordChanged = true
    if (data.email && originalDoc?.email && data.email !== originalDoc.email) context.previousEmail = originalDoc.email
  }
  return data
}

const after: CollectionAfterChangeHook = async ({ doc, req, context }) => {
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
          `<p>${esc(req.user?.name ?? 'Un administrateur')} vous a créé un accès à l’administration de DALIL (rôle : ${doc.role === 'admin' ? 'administrateur' : 'rédacteur'}).</p><p>Choisissez votre mot de passe avec le bouton ci-dessous. Le lien est valable une heure ; passé ce délai, utilisez « Mot de passe oublié » sur la page de connexion.</p>`,
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
  hooks: { beforeChange: [before], afterChange: [after] },
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: ({ req: { user } }) => (user?.role === 'admin' ? true : { id: { equals: user?.id } }),
    update: ({ req: { user } }) => (user?.role === 'admin' ? true : { id: { equals: user?.id } }),
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true },
    {
      name: 'role',
      type: 'select',
      label: 'Rôle',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      access: { update: isAdminField, create: isAdminField },
      options: [
        { label: 'Administrateur — publie et gère tout', value: 'admin' },
        { label: 'Rédacteur — prépare, ne publie pas', value: 'editor' },
      ],
    },
  ],
}
