import type { Payload } from 'payload'

/** Durée de la corbeille : une fiche mise de côté se restaure pendant 30 jours, puis disparaît (tâche quotidienne). */
export const TRASH_DAYS = 30

export const trashCutoff = (now = new Date()) => new Date(now.getTime() - TRASH_DAYS * 86_400_000)
export const daysLeft = (deletedAt: string | Date, now = new Date()) =>
  Math.max(0, Math.ceil((new Date(deletedAt).getTime() + TRASH_DAYS * 86_400_000 - now.getTime()) / 86_400_000))

/** Collections dont la corbeille est active (option Payload `trash`). */
export const trashCollections = (payload: Payload) =>
  (payload.config.collections as unknown as Array<{ slug: string; trash?: boolean }>).filter((c) => c.trash).map((c) => c.slug)

/** Suppression définitive des fiches mises de côté depuis plus de 30 jours. La sauvegarde quotidienne garde la trace. */
export async function purgeTrash(payload: Payload, now = new Date()) {
  const out: Record<string, number> = {}
  for (const slug of trashCollections(payload)) {
    const r = await payload.delete({ collection: slug as never, trash: true, overrideAccess: true, where: { deletedAt: { less_than: trashCutoff(now).toISOString() } } })
    out[slug] = r.docs.length
  }
  return out
}
