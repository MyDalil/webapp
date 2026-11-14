import type { PayloadRequest } from 'payload'
import type { Deps } from '../kpis'

/** Écrans du cockpit déjà livrés (chemins sous /admin). Chaque lot ajoute les siens. */
export const COCKPIT_VIEWS: readonly string[] = ['']

/** Accès aux données avec les droits de la personne connectée (jamais overrideAccess). */
export const depsFor = (req: PayloadRequest): Deps => ({
  count: async (collection, where) =>
    (await req.payload.count({ collection: collection as never, where, req, overrideAccess: false })).totalDocs,
  sum: async (collection, field, where) => {
    const res = await req.payload.find({ collection: collection as never, where, req, overrideAccess: false, pagination: false, depth: 0, select: { [field]: true } as never })
    return res.docs.reduce((n, d) => n + (Number((d as Record<string, unknown>)[field]) || 0), 0)
  },
})

export async function killSwitchMode(req: PayloadRequest): Promise<string> {
  try {
    const c = (await req.payload.findGlobal({ slug: 'controls' as never, req, overrideAccess: false, depth: 0 })) as { killSwitch?: string }
    return c.killSwitch ?? 'off'
  } catch {
    return 'off'
  }
}
