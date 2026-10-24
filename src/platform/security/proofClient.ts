/**
 * Côté navigateur : récupère un défi et le résout (SHA-256, Web Crypto), sans case à cocher ni service tiers.
 * À joindre aux envois des formulaires publics : `fetch(url, { headers: await proofHeaders(), … })`.
 */
const HEADER = 'x-dalil-preuve'

const zeroBits = (bytes: Uint8Array) => {
  let n = 0
  for (const b of bytes) {
    if (b === 0) {
      n += 8
      continue
    }
    return n + Math.clz32(b) - 24
  }
  return n
}

export async function proofHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const r = await fetch('/api/preuve', { cache: 'no-store' })
  if (!r.ok) return extra
  const c = (await r.json()) as { salt: string; bits: number; sig: string }
  const enc = new TextEncoder()
  for (let i = 0; ; i++) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${c.salt}:${i}`)))
    if (zeroBits(hash) >= c.bits) return { ...extra, [HEADER]: JSON.stringify({ ...c, nonce: String(i) }) }
  }
}
