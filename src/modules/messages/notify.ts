import { SITE, esc, layout, paragraphs, send } from '@/platform/mail'

type Submission = { kind: string; status?: string | null; subject: string; email?: string | null; reply?: string | null }

const WHAT: Record<string, string> = { contribution: 'votre contribution', application: 'votre candidature' }

/** Emails de suivi envoyés au demandeur quand l’équipe change le statut d’une contribution ou d’une candidature. */
export async function notifySubmitter(s: Submission) {
  const what = WHAT[s.kind]
  if (!what || !s.email || !s.status) return
  const subject = `« ${esc(s.subject)} »`
  const note = s.reply ? paragraphs(s.reply) : ''
  const pro = s.kind === 'application'
  const content: Record<string, [string, string, string, { label: string; href: string }?]> = {
    processing: [
      `DALIL vérifie ${what}`,
      `${what[0].toUpperCase()}${what.slice(1)} est en cours de vérification.`,
      `<p>${subject}</p><p>L’équipe contrôle les éléments transmis. Vous serez prévenu dès que la vérification sera terminée.</p>${note}`,
    ],
    needs_info: [
      `DALIL a besoin d’informations sur ${what}`,
      'Il nous manque quelques informations.',
      `<p>${subject}</p>${note || '<p>Répondez à cet email avec les éléments demandés.</p>'}<p>Répondez simplement à cet email : votre réponse arrive directement à l’équipe.</p>`,
    ],
    done: [
      pro ? 'Votre candidature DALIL est validée' : 'Votre contribution a été publiée sur DALIL',
      pro ? 'Votre candidature est validée.' : 'Merci, votre contribution est publiée.',
      `<p>${subject}</p>${note}${pro ? '<p>Votre fiche professionnelle sera publiée après la dernière relecture. Rappel : un abonnement ne donne aucun droit au label DALIL Excellence, attribué uniquement après vérification indépendante.</p>' : '<p>Grâce à vous, DALIL est un peu plus fiable.</p>'}`,
      { label: pro ? 'Voir l’annuaire' : 'Voir DALIL', href: `${SITE}/annuaire` },
    ],
    rejected: [
      pro ? 'Votre candidature DALIL n’a pas été retenue' : 'Votre contribution n’a pas été retenue',
      pro ? 'Votre candidature n’a pas été retenue.' : 'Votre contribution n’a pas été retenue.',
      `<p>${subject}</p>${note || '<p>Les éléments transmis ne permettent pas de la publier en l’état.</p>'}<p>Vous pouvez répondre à cet email pour en discuter ou envoyer de nouveaux éléments.</p>`,
    ],
  }
  const c = content[s.status]
  if (!c) return
  await send(s.email, c[0], layout(esc(c[1]), c[2], c[3]))
}
