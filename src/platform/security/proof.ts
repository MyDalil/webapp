import 'server-only'
import { payload } from '@/platform/http'
import { check, issue, PROOF_TTL_SEC, type Proof } from './proofCore'
import { hit } from './rateLimit'

export const PROOF_HEADER = 'x-dalil-preuve'

const secret = async () => (await payload()).secret

/** Défi à résoudre par le navigateur (route /api/preuve). */
export async function newChallenge() {
  return issue(await secret())
}

/** Vérifie la preuve jointe à une requête ; usage unique. Renvoie un message d’erreur, ou null si tout va bien. */
export async function proofError(req: Request): Promise<string | null> {
  let proof: Partial<Proof> | null = null
  try {
    proof = JSON.parse(req.headers.get(PROOF_HEADER) ?? 'null')
  } catch {
    proof = null
  }
  const verdict = check(await secret(), proof)
  if (verdict === 'expired') return 'Le formulaire a expiré : réessayez.'
  if (verdict !== 'ok') return 'Vérification anti-robot impossible : rechargez la page et réessayez.'
  if (await hit('preuve', proof!.salt!, 1, PROOF_TTL_SEC)) return 'Ce formulaire a déjà été envoyé : réessayez.'
  return null
}
