import { SITE, esc, layout, send } from '@/platform/mail'
import { algiersLongDate, algiersTime } from './availability'

type Mail = { to: string; firstName?: string | null }
type Rdv = { start: string; mode: 'cabinet' | 'visio'; practitionerName: string; address?: string | null; city?: string | null; fee?: string | null; payment?: string | null; paymentLink?: string | null; videoUrl?: string | null; patientName?: string; reason?: string | null; cancelNoticeHours?: number | null }

const when = (r: Rdv) => `${algiersLongDate(r.start)} à ${algiersTime(r.start)} (heure d’Alger)`
const where = (r: Rdv) =>
  r.mode === 'visio'
    ? `En visio. ${r.videoUrl ? `Lien de la consultation : <a href="${esc(r.videoUrl)}">${esc(r.videoUrl)}</a>` : 'Le lien de la consultation vous sera envoyé avant le rendez-vous.'}`
    : `Au cabinet : ${esc([r.address, r.city].filter(Boolean).join(', ') || 'adresse indiquée sur la fiche du praticien')}`
const pay = (r: Rdv) =>
  r.fee || r.payment ? `<p>Tarif : ${esc(r.fee ?? 'indiqué par le praticien')}${r.payment ? ` · Paiement : ${esc(r.payment)}` : ''}. Vous réglez directement le praticien ; DALIL n’encaisse rien.${r.paymentLink ? ` <a href="${esc(r.paymentLink)}">Lien de paiement du praticien</a>.` : ''}</p>` : ''

export const bookingConfirmed = (p: Mail, r: Rdv) =>
  send(
    p.to,
    `Rendez-vous confirmé — ${r.practitionerName}, ${algiersLongDate(r.start)}`,
    layout(
      `Votre rendez-vous est confirmé${p.firstName ? `, ${esc(p.firstName)}` : ''}.`,
      `<p><b>${esc(r.practitionerName)}</b><br>${when(r)}</p><p>${where(r)}</p>${pay(r)}<p>Vous pouvez annuler ou déplacer ce rendez-vous depuis votre compte${r.cancelNoticeHours ? ` jusqu’à ${r.cancelNoticeHours} h avant` : ''}. Merci de prévenir si vous ne pouvez pas venir : un créneau libéré profite à un autre patient.</p>`,
      { label: 'Gérer mes rendez-vous', href: `${SITE}/mon-compte` },
    ),
  )

export const bookingToPractitioner = (pro: Mail, r: Rdv) =>
  send(
    pro.to,
    `Nouveau rendez-vous — ${algiersLongDate(r.start)} à ${algiersTime(r.start)}`,
    layout(
      'Nouveau rendez-vous dans votre agenda.',
      `<p><b>${esc(r.patientName ?? 'Patient')}</b><br>${when(r)} · ${r.mode === 'visio' ? 'visio' : 'cabinet'}</p>${r.reason ? `<p>Motif indiqué : « ${esc(r.reason)} »</p>` : ''}`,
      { label: 'Voir mon agenda', href: `${SITE}/espace-pro` },
    ),
  )

export const bookingCancelled = (to: Mail, r: Rdv, by: 'patient' | 'practitioner', reason?: string | null) =>
  send(
    to.to,
    `Rendez-vous annulé — ${algiersLongDate(r.start)} à ${algiersTime(r.start)}`,
    layout(
      'Ce rendez-vous est annulé.',
      `<p><b>${esc(r.practitionerName)}</b><br>${when(r)}</p><p>Annulé par ${by === 'patient' ? 'le patient' : 'le praticien'}.${reason ? ` Motif : « ${esc(reason)} »` : ''}</p>`,
      by === 'practitioner' ? { label: 'Reprendre un rendez-vous', href: `${SITE}/praticiens` } : { label: 'Mon espace', href: `${SITE}/espace-pro` },
    ),
  )

export const bookingReminder = (p: Mail, r: Rdv) =>
  send(
    p.to,
    `Rappel : rendez-vous demain à ${algiersTime(r.start)} — ${r.practitionerName}`,
    layout(
      'Rappel de votre rendez-vous.',
      `<p><b>${esc(r.practitionerName)}</b><br>${when(r)}</p><p>${where(r)}</p>${pay(r)}<p>Un empêchement ? Annulez ou déplacez depuis votre compte.</p>`,
      { label: 'Gérer mes rendez-vous', href: `${SITE}/mon-compte` },
    ),
  )
