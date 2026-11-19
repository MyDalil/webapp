/** Revendication d’une fiche — règles pures, testées. Sans effet sur la vérification (règle 4). */
export const CLAIM_PROOFS = ['telephone', 'registre_commerce', 'carte_pro', 'autre'] as const
export type ClaimProof = (typeof CLAIM_PROOFS)[number]
export const CLAIM_PROOF_LABEL: Record<ClaimProof, string> = { telephone: 'Appel au numéro de la fiche', registre_commerce: 'Registre du commerce', carte_pro: 'Carte professionnelle', autre: 'Autre' }
export const CLAIM_STATUSES = ['en_attente', 'acceptee', 'refusee'] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]
export type ClaimDecision = 'acceptee' | 'refusee'

export const CLAIM_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const CLAIM_DOC_MAX_BYTES = 5 * 1024 * 1024

/** Pièce jointe acceptable : PDF, JPG ou PNG, non vide, 5 Mo au plus. Renvoie un message d’erreur ou null. */
export function claimDocumentError(f: { mimetype?: string | null; size?: number | null }): string | null {
  if (!f.mimetype || !(CLAIM_DOC_TYPES as readonly string[]).includes(f.mimetype)) return 'Pièce refusée : PDF, JPG ou PNG seulement.'
  if (!f.size || f.size <= 0) return 'Pièce vide.'
  if (f.size > CLAIM_DOC_MAX_BYTES) return 'Pièce trop lourde : 5 Mo au plus.'
  return null
}

export type ClaimDocumentInput = { memberId: number; filename: string; mimetype: string; bytes: Uint8Array }
export type ClaimDocumentData = { member: number; filename: string; mimetype: (typeof CLAIM_DOC_TYPES)[number]; size: number; data: string }

/** Données d’une pièce privée telles que la collection `claim-documents` les attend (contenu en base64). */
export function claimDocumentData(input: ClaimDocumentInput): { data: ClaimDocumentData } | { error: string } {
  const error = claimDocumentError({ mimetype: input.mimetype, size: input.bytes.byteLength })
  if (error) return { error }
  const filename = input.filename.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 200) || 'piece'
  return { data: { member: input.memberId, filename, mimetype: input.mimetype as ClaimDocumentData['mimetype'], size: input.bytes.byteLength, data: Buffer.from(input.bytes).toString('base64') } }
}

const ownerId = (v: unknown): string | null => (v == null || v === '' ? null : typeof v === 'object' ? String((v as { id?: unknown }).id ?? '') || null : String(v))

/**
 * Décision possible ? Une demande déjà tranchée ne se rejoue pas ; une fiche déjà rattachée à un autre compte
 * ne s’accepte pas (refus clair). Renvoie un message d’erreur ou null.
 */
export function claimDecisionError(input: { status?: string | null; decision: string; memberId: unknown; currentOwner: unknown }): string | null {
  if (input.decision !== 'acceptee' && input.decision !== 'refusee') return 'Décision inconnue : « acceptee » ou « refusee ».'
  if (input.status !== 'en_attente') return `Cette revendication est déjà « ${String(input.status)} ».`
  if (input.decision === 'refusee') return null
  const owner = ownerId(input.currentOwner)
  if (owner && owner !== ownerId(input.memberId)) return 'Fiche déjà rattachée à un autre compte : retirez d’abord ce rattachement dans la fiche, puis recommencez.'
  return null
}

export { ownerId }
