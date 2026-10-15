import type { Access, CollectionConfig, Where } from 'payload'
import { isMember, isStaff } from '@/platform/access'
import { SITE, layout } from '@/platform/mail'

/** Le compte lui-même, ou l’équipe. */
const selfOrStaff: Access = (args) => {
  if (isStaff(args)) return true
  const { user } = args.req
  return isMember(user) ? ({ id: { equals: user.id } } as Where) : false
}

/**
 * Comptes publics DALIL : un compte par personne (particulier), avec un espace professionnel
 * activable. Email vérifié obligatoire avant toute réservation.
 */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: 'Compte', plural: 'Comptes publics' },
  admin: { group: 'Membres', useAsTitle: 'email', defaultColumns: ['email', 'firstName', 'lastName', 'kind', '_verified', 'createdAt'] },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    verify: {
      generateEmailSubject: () => 'Confirmez votre adresse email — DALIL',
      generateEmailHTML: ({ token, user }) =>
        layout(
          `Bienvenue sur DALIL${user?.firstName ? `, ${String(user.firstName)}` : ''}.`,
          '<p>Confirmez votre adresse email pour activer votre compte et pouvoir réserver vos rendez-vous.</p><p>Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement cet email.</p>',
          { label: 'Confirmer mon email', href: `${SITE}/connexion/verifier?token=${token}` },
        ),
    },
    forgotPassword: {
      generateEmailSubject: () => 'Réinitialiser votre mot de passe DALIL',
      generateEmailHTML: (args) =>
        layout(
          'Réinitialiser votre mot de passe.',
          '<p>Une réinitialisation du mot de passe de votre compte DALIL a été demandée. Le lien est valable une heure.</p><p>Si vous n’êtes pas à l’origine de la demande, ignorez cet email : votre mot de passe actuel reste valable.</p>',
          { label: 'Choisir un nouveau mot de passe', href: `${SITE}/connexion/nouveau-mot-de-passe?token=${String(args?.token ?? '')}` },
        ),
    },
  },
  access: {
    // Inscription uniquement via /api/compte (champs contrôlés, jamais `_verified`).
    create: isStaff,
    read: selfOrStaff,
    update: selfOrStaff,
    delete: selfOrStaff,
    admin: () => false,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', label: 'Prénom', required: true, maxLength: 80 },
        { name: 'lastName', type: 'text', label: 'Nom', required: true, maxLength: 80 },
      ],
    },
    { name: 'phone', type: 'text', label: 'Téléphone', required: true, maxLength: 30 },
    {
      name: 'kind',
      type: 'select',
      label: 'Type de compte',
      required: true,
      defaultValue: 'particulier',
      options: [
        { label: 'Particulier', value: 'particulier' },
        { label: 'Professionnel', value: 'pro' },
      ],
      access: { update: ({ req }) => Boolean(isStaff({ req } as never)) },
    },
    { name: 'termsAcceptedAt', type: 'date', label: 'Conditions acceptées le', required: true, admin: { readOnly: true } },
  ],
}
