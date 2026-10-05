import { clean, fail, json, pathFor, readSession, saveSession } from '@/lib/site'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = clean(url.searchParams.get('type'), 40)
  const key = clean(url.searchParams.get('key'), 200)
  const s = await readSession()
  return json({ saved: !!s?.state.favorites.some((f) => f.itemType === type && f.itemKey === key) })
}

export async function POST(req: Request) {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour enregistrer.', 401)
  const body = await req.json().catch(() => ({}))
  const itemType = clean(body.itemType, 40)
  const itemKey = clean(body.itemKey, 200)
  if (!itemType || !itemKey) return fail('Élément invalide.')
  if (!s.state.favorites.some((f) => f.itemType === itemType && f.itemKey === itemKey)) {
    s.state.favorites.push({ id: ++s.state.seq, itemType, itemKey, label: clean(body.label, 200), path: pathFor(itemType, itemKey) })
    await saveSession(s.id, { state: s.state })
  }
  return json({ ok: true, saved: true })
}

export async function DELETE(req: Request) {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour modifier vos favoris.', 401)
  const body = await req.json().catch(() => ({}))
  const gone = s.state.favorites.filter((f) => f.itemType === body.itemType && f.itemKey === body.itemKey).map((f) => f.id)
  s.state.favorites = s.state.favorites.filter((f) => !gone.includes(f.id))
  s.state.items = s.state.items.filter((i) => !gone.includes(i.favoriteId))
  await saveSession(s.id, { state: s.state })
  return json({ ok: true, saved: false })
}
