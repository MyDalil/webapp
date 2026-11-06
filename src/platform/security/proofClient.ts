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

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const HUMAN = 'x-dalil-humain'

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string
  remove: (id: string) => void
}
let script: Promise<Turnstile | null> | null = null

/** Charge Cloudflare Turnstile une seule fois. */
function loadTurnstile(): Promise<Turnstile | null> {
  const w = window as unknown as { turnstile?: Turnstile }
  if (w.turnstile) return Promise.resolve(w.turnstile)
  script ??= new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve(w.turnstile ?? null)
    s.onerror = () => {
      script = null
      resolve(null)
    }
    document.head.appendChild(s)
  })
  return script
}

/** Jeton Turnstile : invisible ; une case apparaît en bas de l’écran seulement si Cloudflare a un doute. */
async function turnstileToken(): Promise<string | null> {
  if (!SITE_KEY) return null
  const t = await loadTurnstile()
  if (!t) return null
  const box = document.createElement('div')
  box.className = 'dalil-turnstile'
  box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000'
  document.body.appendChild(box)
  const lang = document.documentElement.lang || 'fr'
  try {
    return await new Promise<string | null>((resolve) => {
      const id = t.render(box, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        language: lang,
        callback: (token: string) => resolve(token),
        'error-callback': () => resolve(null),
        'timeout-callback': () => resolve(null),
      })
      setTimeout(() => resolve(null), 60_000)
      box.dataset.id = id
    })
  } finally {
    if (box.dataset.id) t.remove(box.dataset.id)
    box.remove()
  }
}

async function powHeader(): Promise<Record<string, string>> {
  const r = await fetch('/api/preuve', { cache: 'no-store' })
  if (!r.ok) return {}
  const c = (await r.json()) as { salt: string; bits: number; sig: string }
  const enc = new TextEncoder()
  for (let i = 0; ; i++) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${c.salt}:${i}`)))
    if (zeroBits(hash) >= c.bits) return { [HEADER]: JSON.stringify({ ...c, nonce: String(i) }) }
  }
}

export async function proofHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const [pow, token] = await Promise.all([powHeader(), turnstileToken()])
  return { ...extra, ...pow, ...(token ? { [HUMAN]: token } : {}) }
}
