import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Preuve de travail anti-robot, sans service tiers ni case à cocher.
 * Le serveur signe un défi ; le navigateur cherche un nombre tel que SHA-256(défi:nombre) commence par `bits` zéros ;
 * coût négligeable pour une personne (moins d’une seconde), cher pour un envoi en masse.
 */
export const PROOF_BITS = 14
export const PROOF_TTL_SEC = 15 * 60

export type Challenge = { salt: string; bits: number; sig: string }
export type Proof = Challenge & { nonce: string }

const sign = (secret: string, salt: string, bits: number) => createHmac('sha256', `proof:${secret}`).update(`${salt}|${bits}`).digest('base64url')

export function issue(secret: string, now = Date.now(), bits = PROOF_BITS): Challenge {
  const salt = `${Math.floor(now / 1000) + PROOF_TTL_SEC}.${randomBytes(12).toString('base64url')}`
  return { salt, bits, sig: sign(secret, salt, bits) }
}

/** Nombre de bits à zéro en tête d’une empreinte. */
export function leadingZeroBits(hash: Buffer): number {
  let n = 0
  for (const byte of hash) {
    if (byte === 0) {
      n += 8
      continue
    }
    return n + Math.clz32(byte) - 24
  }
  return n
}

export type Verdict = 'ok' | 'missing' | 'forged' | 'expired' | 'weak'

export function check(secret: string, proof: Partial<Proof> | null, now = Date.now(), minBits = PROOF_BITS): Verdict {
  if (!proof?.salt || !proof.sig || proof.nonce === undefined || typeof proof.bits !== 'number') return 'missing'
  const expected = Buffer.from(sign(secret, proof.salt, proof.bits))
  const given = Buffer.from(String(proof.sig))
  if (expected.length !== given.length || !timingSafeEqual(expected, given) || proof.bits < minBits) return 'forged'
  if (Number(proof.salt.split('.')[0]) * 1000 < now) return 'expired'
  const hash = createHash('sha256').update(`${proof.salt}:${proof.nonce}`).digest()
  return leadingZeroBits(hash) >= proof.bits ? 'ok' : 'weak'
}

/** Résolution (tests et outils serveur) ; le navigateur utilise `proofClient.ts`. */
export function solve(c: Challenge): Proof {
  for (let i = 0; ; i++) {
    if (leadingZeroBits(createHash('sha256').update(`${c.salt}:${i}`).digest()) >= c.bits) return { ...c, nonce: String(i) }
  }
}
