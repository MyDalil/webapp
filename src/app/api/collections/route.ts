import { clean, fail, json, readSession, saveSession } from '@/lib/site'

export async function GET() {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour voir vos listes.', 401)
  return json({ collections: s.state.collections, items: s.state.items })
}

export async function POST(req: Request) {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour créer une liste.', 401)
  const body = await req.json().catch(() => ({}))
  if (body.action === 'add') {
    const collectionId = Number(body.collectionId)
    const favoriteId = Number(body.favoriteId)
    if (!s.state.collections.some((c) => c.id === collectionId)) return fail('Liste introuvable.', 404)
    if (!s.state.items.some((i) => i.collectionId === collectionId && i.favoriteId === favoriteId)) s.state.items.push({ collectionId, favoriteId })
  } else {
    const name = clean(body.name, 80)
    if (!name) return fail('Nommez votre liste.')
    s.state.collections.push({ id: ++s.state.seq, name })
  }
  await saveSession(s.id, { state: s.state })
  return json({ ok: true, collections: s.state.collections, items: s.state.items })
}

export async function DELETE(req: Request) {
  const s = await readSession()
  if (!s) return fail('Connectez-vous pour modifier vos listes.', 401)
  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  if (body.favoriteId != null) s.state.items = s.state.items.filter((i) => !(i.collectionId === id && i.favoriteId === Number(body.favoriteId)))
  else {
    s.state.collections = s.state.collections.filter((c) => c.id !== id)
    s.state.items = s.state.items.filter((i) => i.collectionId !== id)
  }
  await saveSession(s.id, { state: s.state })
  return json({ ok: true, collections: s.state.collections, items: s.state.items })
}
