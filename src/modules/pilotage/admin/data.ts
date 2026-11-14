import type { PayloadRequest } from 'payload'
import type { Deps } from '../kpis'

type Role = 'patron' | 'admin' | 'editor' | 'conseiller'
const STAFF: readonly Role[] = ['patron', 'admin']

/**
 * Écrans du cockpit déjà livrés (chemins sous /admin) et rôles qui les ouvrent. Chaque lot ajoute les siens.
 * Hors de ces rôles, le menu retombe sur la liste Payload (droits de la collection).
 */
export const VIEW_ROLES: Readonly<Record<string, readonly Role[]>> = {
  '': ['patron', 'admin', 'editor', 'conseiller'],
  '/cockpit/agents': STAFF,
  '/cockpit/taches': ['patron', 'admin', 'editor'],
  '/cockpit/validation': STAFF,
  '/cockpit/activite': STAFF,
  '/cockpit/conversations': STAFF,
  '/cockpit/memoire': STAFF,
  '/cockpit/connecteurs': STAFF,
  '/cockpit/medias': ['patron', 'admin', 'editor'],
  '/cockpit/historique': ['patron', 'admin', 'editor'],
}
export const COCKPIT_VIEWS: readonly string[] = Object.keys(VIEW_ROLES)
export const viewsFor = (role?: string): string[] => COCKPIT_VIEWS.filter((v) => VIEW_ROLES[v].includes((role ?? 'editor') as Role))

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
