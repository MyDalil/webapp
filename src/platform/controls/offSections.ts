import 'server-only'
import { unstable_cache } from 'next/cache'
import { payload } from '@/platform/http'
import { effectiveOff, normalizeOff, offKeyForPath, offKeyForPlace, offMessageFor, type Lang3 } from './sections'

/** Étiquette du cache des commandes (vidée à chaque enregistrement du global `controls`). */
export const CONTROLS_TAG = 'controls'

type Off = { keys: string[]; message: string | null }
const fetchOff = async (): Promise<Off> => {
  const p = await payload()
  const c = (await p.findGlobal({ slug: 'controls', overrideAccess: true, depth: 0 })) as unknown as { offSections?: unknown; offMessage?: string | null }
  return { keys: normalizeOff(c.offSections), message: c.offMessage ?? null }
}
// Une lecture de base au plus par période de cache, quel que soit le nombre de visites.
const cached = unstable_cache(fetchOff, ['controls-off-sections'], { tags: [CONTROLS_TAG], revalidate: 3600 })

/** Clés coupées (rubriques `r:…`, catégories `c:…`). Panne de lecture : rien n’est coupé (le site reste servi). */
export async function offState(): Promise<Off> {
  try {
    return await cached()
  } catch {
    return { keys: [], message: null }
  }
}
export const offSections = async () => (await offState()).keys
export const isSectionOff = async (key: string) => effectiveOff(await offSections()).has(key)

/** Ensemble effectif (une rubrique coupée coupe ses catégories). */
export const offSet = async () => effectiveOff(await offSections())

/** Une page publique (chemin sans langue) est-elle coupée ? Renvoie le message à afficher, ou null. */
export async function sectionGate(path: string, lang: Lang3, place?: { sector?: string | null; category?: string | null }): Promise<string | null> {
  const { keys, message } = await offState()
  if (!keys.length) return null
  const off = effectiveOff(keys)
  const key = offKeyForPath(path, off) ?? (place ? offKeyForPlace(place.sector, place.category, off) : null)
  return key ? offMessageFor(lang, message) : null
}
