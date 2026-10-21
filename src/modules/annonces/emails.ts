import { SITE, esc, layout, send } from '@/platform/mail'

export type ClassifiedMail = { title: string; slug: string; category: string; reason?: string; expiresAt?: string }

const page = (a: ClassifiedMail) => `${SITE}/annonces/${a.category}/${a.slug}`
const mine = `${SITE}/mon-compte#annonces`
const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))

export const classifiedSubmitted = (to: string, a: ClassifiedMail) =>
  send(to, `Annonce reçue — ${a.title}`, layout('Votre annonce est reçue.', `<p>« ${esc(a.title)} »</p><p>L’équipe DALIL la contrôle avant publication. Vous recevrez le résultat par email.</p>`, { label: 'Mes annonces', href: mine }))

export const classifiedPublished = (to: string, a: ClassifiedMail) =>
  send(to, `Annonce publiée — ${a.title}`, layout('Votre annonce est en ligne.', `<p>« ${esc(a.title)} »</p><p>Les personnes intéressées vous écrivent dans la messagerie DALIL. Vous recevez un email à chaque nouveau message.</p>`, { label: 'Voir l’annonce', href: page(a) }))

export const classifiedRejected = (to: string, a: ClassifiedMail) =>
  send(to, `Annonce refusée — ${a.title}`, layout('Votre annonce n’a pas été publiée.', `<p>« ${esc(a.title)} »</p><p>Motif : ${esc(a.reason ?? '')}</p><p>Vous pouvez la corriger et la proposer à nouveau.</p>`, { label: 'Corriger mon annonce', href: mine }))

export const classifiedExpiring = (to: string, a: ClassifiedMail) =>
  send(to, `Votre annonce expire bientôt — ${a.title}`, layout('Votre annonce expire bientôt.', `<p>« ${esc(a.title)} » expire le <b>${day(a.expiresAt ?? new Date().toISOString())}</b>.</p><p>Renouvelez-la en un clic si elle est toujours d’actualité.</p>`, { label: 'Renouveler', href: mine }))

export const classifiedExpired = (to: string, a: ClassifiedMail) =>
  send(to, `Annonce expirée — ${a.title}`, layout('Votre annonce a expiré.', `<p>« ${esc(a.title)} » n’est plus visible.</p><p>Renouvelez-la si elle est toujours d’actualité.</p>`, { label: 'Renouveler', href: mine }))

export const classifiedMessage = (to: string, a: ClassifiedMail, from: string, href: string) =>
  send(to, `Nouveau message — ${a.title}`, layout('Vous avez un nouveau message.', `<p>De : <b>${esc(from)}</b><br>Annonce : « ${esc(a.title)} »</p><p>Répondez dans la messagerie DALIL.</p>`, { label: 'Lire le message', href }))
