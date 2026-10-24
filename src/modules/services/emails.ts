import { SITE, esc, layout, send } from '@/platform/mail'
import { algiersLongDate, algiersTime } from './planning'

export type MissionMail = {
  id: number
  start: string
  hours: number
  activityLabel: string
  providerName: string
  clientName: string
  communeName: string | null
  address?: string | null
  details?: string | null
  estimateLabel: string
  payment?: string | null
  respondBy?: string
}

const link = (m: MissionMail) => `${SITE}/missions/${m.id}`
const when = (m: MissionMail) => `${algiersLongDate(m.start)} à ${algiersTime(m.start)} (heure d’Alger), environ ${m.hours} h`
const summary = (m: MissionMail) =>
  `<p><b>${esc(m.activityLabel)}</b><br>${when(m)}<br>${esc(m.communeName ?? '')}</p><p>${esc(m.estimateLabel)} — à régler directement au prestataire${m.payment ? ` (${esc(m.payment)})` : ''}. DALIL n’encaisse rien.</p>`

export const requestToProvider = (to: string, m: MissionMail) =>
  send(
    to,
    `Nouvelle demande — ${m.activityLabel}, ${algiersLongDate(m.start)}`,
    layout(
      'Vous avez reçu une nouvelle demande.',
      `${summary(m)}<p>De : <b>${esc(m.clientName)}</b></p>${m.details ? `<p>« ${esc(m.details)} »</p>` : ''}<p>Répondez avant le <b>${algiersLongDate(m.respondBy ?? m.start)} à ${algiersTime(m.respondBy ?? m.start)}</b>, sinon la demande expire. L’adresse exacte vous est transmise dès que vous acceptez.</p>`,
      { label: 'Répondre à la demande', href: link(m) },
    ),
  )

export const requestSent = (to: string, m: MissionMail) =>
  send(
    to,
    `Demande envoyée à ${m.providerName}`,
    layout(
      'Votre demande est envoyée.',
      `${summary(m)}<p><b>${esc(m.providerName)}</b> a 24 h pour l’accepter. Vous recevez un email dès sa réponse ; vous pouvez échanger avec lui dans la messagerie DALIL.</p>`,
      { label: 'Suivre ma demande', href: link(m) },
    ),
  )

export const requestAccepted = (to: string, m: MissionMail) =>
  send(
    to,
    `Mission acceptée — ${m.providerName}, ${algiersLongDate(m.start)}`,
    layout(
      'Bonne nouvelle : votre mission est acceptée.',
      `${summary(m)}<p><b>${esc(m.providerName)}</b> viendra à l’adresse indiquée${m.address ? ` : ${esc(m.address)}` : ''}. Pour toute précision, utilisez la messagerie DALIL.</p>`,
      { label: 'Voir la mission', href: link(m) },
    ),
  )

export const requestDeclined = (to: string, m: MissionMail, expired = false) =>
  send(
    to,
    expired ? `Sans réponse — ${m.activityLabel}` : `Demande déclinée — ${m.activityLabel}`,
    layout(
      expired ? 'Le prestataire n’a pas répondu à temps.' : 'Le prestataire n’est pas disponible.',
      `${summary(m)}<p>D’autres prestataires vérifiés peuvent vous aider : relancez votre demande en un clic.</p>`,
      { label: 'Trouver un autre prestataire', href: `${SITE}/services` },
    ),
  )

export const missionCancelled = (to: string, m: MissionMail, by: 'client' | 'provider', reason?: string | null) =>
  send(
    to,
    `Mission annulée — ${m.activityLabel}, ${algiersLongDate(m.start)}`,
    layout(
      'Cette mission est annulée.',
      `${summary(m)}<p>Annulée par ${by === 'client' ? 'le client' : 'le prestataire'}.${reason ? ` Motif : « ${esc(reason)} »` : ''}</p>`,
      { label: 'Voir la mission', href: link(m) },
    ),
  )

export const newMessage = (to: string, m: MissionMail, fromName: string) =>
  send(
    to,
    `Nouveau message de ${fromName} — ${m.activityLabel}`,
    layout('Vous avez un nouveau message.', `<p><b>${esc(fromName)}</b> vous a écrit à propos de : ${esc(m.activityLabel)}, ${algiersLongDate(m.start)}.</p><p>Pour votre sécurité, les échanges restent dans la messagerie DALIL.</p>`, { label: 'Lire le message', href: link(m) }),
  )

export const missionReminder = (to: string, m: MissionMail, side: 'client' | 'provider') =>
  send(
    to,
    `Rappel : mission demain à ${algiersTime(m.start)} — ${m.activityLabel}`,
    layout(
      'Rappel de votre mission de demain.',
      `${summary(m)}<p>${side === 'client' ? `Avec <b>${esc(m.providerName)}</b>.` : `Chez <b>${esc(m.clientName)}</b>${m.address ? `, ${esc(m.address)}` : ''}.`} Un empêchement ? Prévenez dans la messagerie ou annulez depuis la mission.</p>`,
      { label: 'Voir la mission', href: link(m) },
    ),
  )

export const reviewInvite = (to: string, m: MissionMail) =>
  send(
    to,
    `Comment s’est passée votre mission avec ${m.providerName} ?`,
    layout('Votre avis compte.', `<p>${esc(m.activityLabel)}, ${algiersLongDate(m.start)}.</p><p>Seuls les clients d’une mission réalisée via DALIL peuvent laisser un avis : c’est ce qui les rend fiables.</p>`, { label: 'Donner mon avis', href: link(m) }),
  )
