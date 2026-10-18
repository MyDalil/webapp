import type { Payload, PayloadRequest } from 'payload'
import { WILAYAS } from '@/platform/referentiel/catalog'

/** Fiche prête à importer (recherche documentaire ou OpenStreetMap). Faits seulement, textes rédigés par DALIL. */
export type ImportRecord = {
  id: string
  provider: 'dalil' | 'osm'
  name: string
  nameAr?: string | null
  sector: string
  category: string
  wilaya: string | null
  city?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  phone?: string | null
  email?: string | null
  website?: string | null
  hours?: { days: string; time: string }[]
  intro?: string | null
  inception?: string | null
  sourceUrl: string
  note?: string | null
  /** Organisme public : coordonnées visibles par tous. */
  publicBody?: boolean
}

const key = (s?: string | null) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const slugify = (s: string) => key(s).replace(/ /g, '-')
const code = (name: string | null) => {
  const w = WILAYAS.find((x) => key(x.name) === key(name))
  return w ? String(w.code) : undefined
}
const site = (u?: string | null) => (u ? (/^https?:\/\//.test(u) ? u : `https://${u}`) : undefined)
const email = (e?: string | null) => (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? e.trim() : undefined)

/**
 * Crée ou complète des fiches. Idempotent (identifiant de source).
 * Une fiche existante au même nom dans la même wilaya est COMPLÉTÉE : seuls les champs vides sont remplis,
 * jamais écrasés (le travail de l’équipe et les vérifications restent intacts).
 * Toute fiche créée arrive « Repérée — à vérifier », avec sa source.
 */
export async function importPlaces(payload: Payload, req: PayloadRequest | undefined, records: ImportRecord[]) {
  const ctx = { skipRevalidate: true, skipAudit: true }
  const existing = await payload.find({ collection: 'places', req, overrideAccess: true, limit: 100000, depth: 0, pagination: false, select: { name: true, wilaya: true, slug: true, source: true } as never })
  const byExternal = new Map<string, number>()
  const byName = new Map<string, number>()
  const slugs = new Set<string>()
  for (const d of existing.docs as unknown as { id: number; name: string; wilaya?: string | null; slug?: string; source?: { externalId?: string | null } }[]) {
    if (d.source?.externalId) byExternal.set(d.source.externalId, d.id)
    byName.set(`${key(d.name)}|${d.wilaya ?? ''}`, d.id)
    if (d.slug) slugs.add(d.slug)
  }
  let created = 0
  let completed = 0
  let skipped = 0
  for (const r of records) {
    const wilaya = code(r.wilaya)
    if (!wilaya || !r.name || !r.city && !r.wilaya) {
      skipped++
      continue
    }
    const city = r.city || r.wilaya || ''
    const facts = {
      nameAr: r.nameAr || undefined,
      address: r.address || undefined,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      phone: r.phone || undefined,
      email: email(r.email),
      website: site(r.website),
      hours: r.hours?.length ? r.hours : undefined,
      intro: r.intro || undefined,
      inception: r.inception || undefined,
      // Source publique affichée sur la fiche (attribution ODbL pour OpenStreetMap).
      sources: [{ label: r.provider === 'osm' ? 'OpenStreetMap — © les contributeurs OpenStreetMap (ODbL)' : 'Source officielle consultée', url: r.sourceUrl }],
    }
    const id = byExternal.get(r.id) ?? byName.get(`${key(r.name)}|${wilaya}`)
    try {
      if (id) {
        const cur = (await payload.findByID({ collection: 'places', id, req, overrideAccess: true, depth: 0 })) as unknown as Record<string, unknown>
        const fill = Object.fromEntries(Object.entries(facts).filter(([k, v]) => v !== undefined && (cur[k] === null || cur[k] === undefined || cur[k] === '' || (Array.isArray(cur[k]) && !(cur[k] as unknown[]).length))))
        if (Object.keys(fill).length) {
          await payload.update({ collection: 'places', id, req, overrideAccess: true, context: ctx, data: { ...fill, ...(r.publicBody ? { showContacts: true } : {}) } as never })
          completed++
        } else skipped++
        continue
      }
      let slug = slugify(key(r.name).includes(key(city)) ? r.name : `${r.name} ${city}`).slice(0, 90)
      if (slugs.has(slug)) slug = `${slug}-${slugify(r.id.split(/[:/]/).pop() ?? String(created))}`.slice(0, 110)
      slugs.add(slug)
      const doc = await payload.create({
        collection: 'places',
        req,
        overrideAccess: true,
        context: ctx,
        data: {
          _status: 'published',
          slug,
          name: r.name,
          sector: r.sector,
          category: r.category,
          wilaya,
          city,
          place: city,
          ...facts,
          showContacts: Boolean(r.publicBody),
          verification: 'spotted',
          source: { provider: r.provider, externalId: r.id, url: r.sourceUrl, notes: r.note ?? undefined },
        } as never,
      })
      byExternal.set(r.id, doc.id as number)
      byName.set(`${key(r.name)}|${wilaya}`, doc.id as number)
      created++
    } catch (e) {
      skipped++
      payload.logger.warn(`Import « ${r.name} » ignoré : ${(e as Error).message.slice(0, 160)}`)
    }
  }
  payload.logger.info(`Import des fiches : ${created} créées, ${completed} complétées, ${skipped} ignorées`)
  return { created, completed, skipped }
}
