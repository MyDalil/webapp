import 'server-only'
import { ActionError } from '@/platform/actions'
import { payload as getPayload } from '@/platform/http'
import { SITE, esc, layout, paragraphs, send } from '@/platform/mail'
import { notifyStaff } from '@/platform/telegram/notify'
import { refreshSubscriptionTarget } from './subscriptionsCollection'
import { claimDecisionError, claimDocumentData, ownerId, type ClaimDecision, type ClaimDocumentInput } from './claimsCore'
import { TARGET_LABEL, isTarget } from './subscriptionsCore'

type ClaimRow = { id: number; member?: unknown; targetCollection?: string; targetId?: string; status?: string; note?: string | null }

/**
 * Décision d’un administrateur sur une revendication.
 * Acceptée : la fiche est rattachée au compte (`owner` sur places, practitioners, providers), le membre est prévenu
 * par email, l’équipe par Telegram. Fiche déjà rattachée à un autre compte → refus clair, rien n’est modifié.
 * Refusée : note enregistrée, membre prévenu. Sans effet sur la vérification (règle 4).
 */
export async function decideClaim(id: number, decision: ClaimDecision, note = '', by = 'Équipe DALIL'): Promise<{ summary: string; status: ClaimDecision }> {
  const p = await getPayload()
  const claim = (await p.findByID({ collection: 'claims', id, depth: 0, overrideAccess: true }).catch(() => null)) as ClaimRow | null
  if (!claim) throw new ActionError('invalid_input', 'Revendication introuvable.')
  const target = claim.targetCollection
  if (!isTarget(target) || !claim.targetId) throw new ActionError('invalid_input', 'Fiche de la revendication invalide.')
  const fiche = (await p.findByID({ collection: target, id: String(claim.targetId), depth: 0, overrideAccess: true }).catch(() => null)) as { id: number; name?: string; slug?: string; owner?: unknown; _status?: string } | null
  if (!fiche && decision === 'acceptee') throw new ActionError('invalid_input', 'Fiche introuvable : revendication à refuser.')
  const memberId = ownerId(claim.member)
  const error = claimDecisionError({ status: claim.status, decision, memberId, currentOwner: fiche?.owner })
  if (error) throw new ActionError('invalid_input', error)
  const text = note.trim().slice(0, 1000)
  if (decision === 'acceptee') {
    // Mise à jour technique : seul `owner` change (un brouillon en attente sur une adresse publiée reste intact).
    // Brouillon jamais publié (fiche créée par le bot, lien /finaliser) : écrit en brouillon, sans validation de publication.
    const draft = target === 'places' && fiche!._status === 'draft'
    await p.update({ collection: target, id: fiche!.id, data: { owner: Number(memberId) }, overrideAccess: true, context: { channel: 'admin' }, ...(draft ? { draft: true } : {}) })
  }
  const line = `${new Date().toISOString().slice(0, 10)} — ${decision === 'acceptee' ? 'acceptée' : 'refusée'} par ${by}${text ? ` : ${text}` : ''}`
  await p.update({ collection: 'claims', id, data: { status: decision, note: [claim.note, line].filter(Boolean).join('\n') }, overrideAccess: true })
  if (decision === 'acceptee') await refreshSubscriptionTarget(p, target, fiche!.id)

  const name = fiche?.name ?? `${TARGET_LABEL[target]} n° ${claim.targetId}`
  const member = memberId ? ((await p.findByID({ collection: 'members', id: Number(memberId), depth: 0, overrideAccess: true }).catch(() => null)) as { email?: string; firstName?: string } | null) : null
  if (member?.email) {
    const hello = `Bonjour${member.firstName ? ` ${esc(member.firstName)}` : ''}`
    await send(
      member.email,
      decision === 'acceptee' ? `Fiche rattachée à votre compte : ${name}` : `Votre demande pour ${name}`,
      decision === 'acceptee'
        ? layout(`${hello}, la fiche « ${esc(name)} » est rattachée à votre compte.`, `<p>Vous pouvez désormais la suivre depuis votre espace professionnel.</p>${text ? paragraphs(text) : ''}<p>Ce rattachement n’a aucun effet sur la vérification de la fiche, qui reste faite par l’équipe DALIL.</p>`, { label: 'Mon espace professionnel', href: `${SITE}/espace-pro` })
        : layout(`${hello}, votre demande n’a pas été acceptée.`, `<p>Nous n’avons pas pu confirmer que la fiche « ${esc(name)} » vous appartient.</p>${text ? paragraphs(text) : ''}<p>Répondez à cet email avec un autre justificatif si besoin.</p>`),
      { idempotencyKey: `revendication-${id}-${decision}` },
    )
  }
  const summary = `Revendication n° ${id} ${decision === 'acceptee' ? 'acceptée' : 'refusée'} : ${name}`
  await notifyStaff(`${by} : ${summary}.`)
  return { summary, status: decision }
}

/**
 * Enregistre la pièce d’une revendication (route serveur du membre connecté). PDF, JPG ou PNG, 5 Mo au plus ;
 * stockée en base, lisible par un administrateur seulement. Renvoie l’identifiant à mettre dans `claims.proofFile`.
 */
export async function saveClaimDocument(input: ClaimDocumentInput): Promise<{ id: number } | { error: string }> {
  const built = claimDocumentData(input)
  if ('error' in built) return built
  const p = await getPayload()
  const doc = await p.create({ collection: 'claim-documents', data: built.data, overrideAccess: true })
  return { id: doc.id as number }
}
