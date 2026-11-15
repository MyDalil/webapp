import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import collected from '@/modules/annuaire/data/place-photos.json'
import bodies from '@/modules/annuaire/data/public-bodies.json'
import { importPlaces, type ImportRecord } from '@/modules/annuaire'
import { COMMUNES } from '@/platform/referentiel/communes'

/** Wilaya d’une institution sans wilaya déclarée : celle de la commune la plus proche (centre de commune, Wikidata). */
function nearestWilaya(lat: number, lng: number): string | null {
  let best: { d: number; w: number } | null = null
  for (const c of COMMUNES) {
    if (c.lat == null || c.lng == null) continue
    const d = (c.lat - lat) ** 2 + ((c.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (!best || d < best.d) best = { d, w: c.wilaya }
  }
  return best ? String(best.w) : null
}

type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }
type Photo = { url: string; author: string; license: string; licenseUrl: string | null; page: string; width?: number; height?: number }
type Details = { website: string | null; phone: string | null; email: string | null; address: string | null; source: string }

/**
 * Lieux publics : 1. institutions de l’État (Wikidata, `scripts/import/fetch-public-bodies.mjs`), créées ou complétées ;
 * 2. photos sous licence libre et coordonnées officielles (collecte `scripts/import/fetch-place-photos.mjs`).
 * Complète seulement : une fiche qui a déjà ses photos (DALIL ou libres) les garde ; un champ rempli n’est jamais écrasé.
 * Rejouable sans effet de bord (identifiant de source).
 */
export const up = deferred('20261114_230000_photos_lieux_publics', async ({ payload, req }: MigrateUpArgs): Promise<void> => {
  const records = (bodies as ImportRecord[]).map((r) => (r.wilaya || r.lat == null || r.lng == null ? r : { ...r, wilaya: nearestWilaya(r.lat, r.lng) }))
  if (records.length) {
    const db0 = (payload.db as unknown as { drizzle: Db }).drizzle
    await importPlaces(payload, req, records, db0 as never)
  }
  const photos = (collected as { photos: Record<string, Photo[]> }).photos ?? {}
  const details = (collected as { details?: Record<string, Details> }).details ?? {}
  const ids = [...new Set([...Object.keys(photos), ...Object.keys(details)])]
  if (!ids.length) return
  const db = (payload.db as unknown as { drizzle: Db }).drizzle
  const ctx = { skipRevalidate: true }
  let withPhoto = 0
  let withDetails = 0
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const { rows } = await db.execute(sql`
      SELECT p.id, p.source_external_id AS ext, p.website, p.phone, p.email, p.address,
        (SELECT count(*) FROM places_external_photos e WHERE e._parent_id = p.id)::int AS ext_photos,
        (SELECT count(*) FROM places_rels r WHERE r.parent_id = p.id AND r.path = 'photos')::int AS own_photos
      FROM places p WHERE p.source_external_id IN ${sql.raw(`(${chunk.map((x) => `'${x.replace(/'/g, "''")}'`).join(',')})`)}`)
    for (const r of rows) {
      const ext = String(r.ext)
      const data: Record<string, unknown> = {}
      const found = photos[ext]
      if (found?.length && !Number(r.ext_photos) && !Number(r.own_photos)) {
        data.externalPhotos = found.slice(0, 3).map((x) => ({ url: x.url, author: x.author, license: x.license, licenseUrl: x.licenseUrl ?? undefined, page: x.page, width: x.width, height: x.height }))
        withPhoto++
      }
      const d = details[ext]
      if (d) {
        if (d.website && !r.website) data.website = d.website
        if (d.phone && !r.phone) data.phone = d.phone
        if (d.email && !r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) data.email = d.email
        if (d.address && !r.address) data.address = d.address
        if (data.website || data.phone || data.email || data.address) withDetails++
      }
      if (!Object.keys(data).length) continue
      try {
        await payload.update({ collection: 'places', id: Number(r.id), req, overrideAccess: true, context: ctx, data })
      } catch (e) {
        payload.logger.warn(`Photos lieux publics : fiche ${String(r.id)} ignorée (${(e as Error).message})`)
      }
    }
  }
  payload.logger.info(`Photos lieux publics : ${withPhoto} fiches avec photo libre, ${withDetails} fiches complétées (Wikidata).`)
})

export async function down(_: MigrateDownArgs): Promise<void> {
  // Données ajoutées en complément : rien à défaire automatiquement (les fiches gardent leur historique de versions).
}
