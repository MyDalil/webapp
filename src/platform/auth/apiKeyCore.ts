import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Clés API nominatives sans base : DALIL_MCP_KEYS = « email:sha256hex » séparés par des virgules.
 * La clé en clair (« dalil_… ») n’est jamais stockée ; révoquer = retirer la ligne de la variable.
 */
export const KEY_PREFIX = 'dalil_'

export type KeyEntry = { email: string; hash: string }

export const hashKey = (plain: string) => createHash('sha256').update(plain, 'utf8').digest('hex')

export function generateKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function parseKeys(env: string | undefined): KeyEntry[] {
  return (env ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const i = line.lastIndexOf(':')
      const email = line.slice(0, i).trim().toLowerCase()
      const hash = line.slice(i + 1).trim().toLowerCase()
      return i > 0 && email.includes('@') && /^[0-9a-f]{64}$/.test(hash) ? [{ email, hash }] : []
    })
}

/** Email du titulaire de la clé, ou null. Compare toutes les lignes en temps constant (pas de sortie anticipée). */
export function matchKey(plain: string, entries: KeyEntry[]): string | null {
  if (!plain.startsWith(KEY_PREFIX) || plain.length > 200) return null
  const h = Buffer.from(hashKey(plain), 'hex')
  let found: string | null = null
  for (const e of entries) {
    const ok = timingSafeEqual(h, Buffer.from(e.hash, 'hex'))
    if (ok && !found) found = e.email
  }
  return found
}

/** Jeton « Authorization: Bearer … », ou null. */
export function bearerOf(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '')
  return m ? m[1] : null
}
