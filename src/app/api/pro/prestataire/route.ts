import { currentMember, myProvider, providerDocuments, providerMissions, saveMyProvider } from '@/modules/services'
import { fail, json } from '@/platform/http'

export async function GET() {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const provider = await myProvider(member)
  // La note interne de l’équipe n’est jamais renvoyée au prestataire.
  const { internalNote: _n, verifiedBy: _v, ...safe } = (provider ?? {}) as unknown as Record<string, unknown>
  return json({ provider: provider ? safe : null, missions: await providerMissions(member), documents: provider ? await providerDocuments(provider.id) : [] })
}

export async function PUT(req: Request) {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const r = await saveMyProvider(member, await req.json().catch(() => ({})))
  return 'error' in r ? fail(r.error, r.status) : json({ ok: true })
}
