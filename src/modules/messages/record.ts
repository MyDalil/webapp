import 'server-only'
import { payload } from '@/platform/http'
import { SITE, TEAM, esc, layout, send } from '@/platform/mail'

const KIND_LABEL = {
  contribution: 'Nouvelle contribution',
  application: 'Nouvelle candidature professionnelle',
  contact: 'Nouvelle demande de contact',
  feedback: 'Nouvel avis',
  diagnostic: 'Nouveau parcours personnalisé',
} as const

/** Enregistre une demande, alerte l’équipe et accuse réception à l’expéditeur s’il a laissé son email. */
export async function record(kind: keyof typeof KIND_LABEL, subject: string, data: unknown, email?: string, session?: string) {
  const p = await payload()
  const doc = await p.create({
    collection: 'submissions',
    data: { kind, status: 'new', subject: subject.slice(0, 200) || kind, data: data as never, email: email || undefined, session },
    overrideAccess: true,
  })
  const admin = `${SITE}/admin/collections/submissions/${doc.id}`
  await send(
    TEAM,
    `${KIND_LABEL[kind]} — ${subject.slice(0, 80)}`,
    layout(esc(KIND_LABEL[kind]), `<p><b>${esc(subject)}</b>${email ? `<br>De : ${esc(email)}` : ''}</p><p>À traiter dans la boîte de réception DALIL.</p>`, { label: 'Ouvrir la demande', href: admin }),
  )
  if (email && (kind === 'contribution' || kind === 'application')) {
    const what = kind === 'contribution' ? 'votre contribution' : 'votre candidature'
    await send(
      email,
      `DALIL a bien reçu ${what}`,
      layout(
        `Merci, nous avons bien reçu ${what}.`,
        `<p>« ${esc(subject)} »</p><p>L’équipe DALIL vérifie chaque envoi avant toute publication. Vous recevrez le résultat de la vérification par email.</p>`,
      ),
    )
  }
}
