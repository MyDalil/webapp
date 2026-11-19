/**
 * Dépendances des paiements (base, notifications, email, verrou, activation), injectées pour être testées sans base.
 * Les champs `externalId`, `purpose`, `subscription` de `payments` et la collection `subscriptions` viennent du lot K :
 * accès par un type souple tant que `payload-types.ts` ne les connaît pas.
 */
export type Doc = Record<string, unknown> & { id: number | string }
export type Db = {
  find: (a: Record<string, unknown>) => Promise<{ docs: Doc[] }>
  findByID: (a: Record<string, unknown>) => Promise<Doc | null>
  create: (a: Record<string, unknown>) => Promise<Doc>
  update: (a: Record<string, unknown>) => Promise<Doc>
}
export type NotifyButton = { text: string; data: string }

/** Signature figée par le contrat du 3ᵉ tour (lot K, `@/modules/pros`). */
export type ActivateSubscription = (id: number, opts: { paymentId?: number; note?: string; by: string }) => Promise<void>

export type Deps = {
  db: () => Promise<Db>
  notify: (text: string, opts?: { buttons?: NotifyButton[][] }) => Promise<void>
  mail: (to: string, subject: string, html: string, opts?: { idempotencyKey?: string }) => Promise<boolean>
  /** Bouton signé Telegram (null si la signature est désactivée). */
  sign: (ref: string) => string | null
  activateSubscription: ActivateSubscription
  activateSponsorship: (sponsorshipId: number, paymentId: number) => Promise<void>
  /** Pièce privée (`saveClaimDocument` : collection `claim-documents`, lecture administrateur seulement). */
  saveDocument: (input: { memberId: number; filename: string; mimetype: string; bytes: Uint8Array }) => Promise<{ id: number } | { error: string }>
  /** Verrou court anti-doublon (vrai si obtenu) et sa libération si le traitement échoue. */
  lock: (key: string) => Promise<boolean>
  unlock: (key: string) => Promise<void>
  fetch: typeof fetch
  env: Record<string, string | undefined>
  site: string
  now: () => Date
}

/** Identifiant numérique d’une relation (objet peuplé ou identifiant). */
export const relId = (v: unknown): number | null => {
  const raw = v && typeof v === 'object' ? (v as { id?: unknown }).id : v
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null
}
