import { WILAYAS } from '@/platform/referentiel/catalog'
import { clean, fail, json } from '@/platform/http'
import { deleteSession, ensureSession, readSession, saveSession } from '@/modules/membres'
import { record } from '@/modules/messages'

const view = (s: Awaited<ReturnType<typeof readSession>>) => ({
  profile: s?.profile ?? null,
  favorites: (s?.state.favorites ?? []).map((f) => ({ path: f.path, label: f.label })),
})

export async function GET() {
  return json(view(await readSession()))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.action) return fail('Requête invalide.')

  const s = await ensureSession()
  if (!s) return fail('Connectez-vous pour continuer.', 401)

  if (body.action === 'profile') {
    const p = body.profile ?? {}
    const profile = { territory: clean(p.territory, 120), interest: clean(p.interest, 160) }
    await saveSession(s.id, { profile })
    return json(view({ ...s, profile: { ...s.profile, ...profile } }))
  }

  if (body.action === 'wilaya') {
    const code = Number(body.code)
    await saveSession(s.id, { profile: { wilaya: WILAYAS.some((w) => w.code === code) ? code : null } })
    return json({ ok: true })
  }

  if (body.action === 'favorite') {
    const path = clean(body.path, 300)
    if (!path) return fail('Élément invalide.')
    if (body.remove) s.state.favorites = s.state.favorites.filter((f) => f.path !== path)
    else if (!s.state.favorites.some((f) => f.path === path)) {
      const [, type = 'page', key = path] = path.split('/')
      s.state.favorites.push({ id: ++s.state.seq, itemType: type === 'adresses' ? 'listing' : type === 'guides' ? 'guide' : type, itemKey: key, label: clean(body.label, 200), path })
    }
    await saveSession(s.id, { state: s.state })
    return json(view(s))
  }

  if (body.action === 'feedback') {
    await record('feedback', `Avis ${clean(body.rating, 10)}/5 — ${clean(body.path, 200) || 'site'}`, { rating: clean(body.rating, 10), path: clean(body.path, 300), feedback: clean(body.feedback, 5000) }, undefined, s.sid)
    return json(view(s))
  }

  if (body.action === 'event') return json(view(s))

  return fail('Action inconnue.')
}

export async function DELETE() {
  await deleteSession()
  return json({ ok: true })
}
