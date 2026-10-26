import { algiersDate, freeSlots, getPractitioner, type Mode } from '@/modules/sante'
import { fail, json } from '@/platform/http'

/** Créneaux libres : /api/rdv/creneaux?praticien=slug&from=AAAA-MM-JJ&days=7&mode=cabinet */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const pr = await getPractitioner(u.searchParams.get('praticien') ?? '')
  if (!pr) return fail('Praticien introuvable.', 404)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('from') ?? '') ? u.searchParams.get('from')! : algiersDate(new Date())
  const days = Math.min(14, Math.max(1, Number(u.searchParams.get('days')) || 7))
  const mode = (['cabinet', 'visio'].includes(u.searchParams.get('mode') ?? '') ? u.searchParams.get('mode') : undefined) as Mode | undefined
  return json({ days: await freeSlots(pr, from, days, mode) })
}
