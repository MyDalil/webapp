import type { Payload, PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { scorePlace } from './ranking'
import { exclusionReason } from './exclusions'
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
type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }

/** Insertion groupée (une requête par lot de 500) : indispensable pour des milliers de fiches au build (base distante). */
async function bulkCreate(db: Db, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const res = await db.execute(sql`
      INSERT INTO places (name, name_ar, sector, category, intro, inception, wilaya, city, place, address, lat, lng, phone, email, website,
        show_contacts, verification, slug, _status, score, source_provider, source_external_id, source_url, source_notes)
      SELECT x.name, x.name_ar, x.sector::enum_places_sector, x.category, x.intro, x.inception, x.wilaya::enum_places_wilaya, x.city, x.city, x.address,
        x.lat, x.lng, x.phone, x.email, x.website, x.show_contacts, 'spotted', x.slug, 'published', x.score,
        x.provider::enum_places_source_provider, x.external_id, x.url, x.notes
      FROM jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb) AS x(name text, name_ar text, sector text, category text, intro text, inception text,
        wilaya text, city text, address text, lat numeric, lng numeric, phone text, email text, website text, show_contacts boolean, slug text,
        score numeric, provider text, external_id text, url text, notes text)
      RETURNING id, source_external_id`)
    const ids = new Map(res.rows.map((r) => [String(r.source_external_id), Number(r.id)]))
    const hours: Record<string, unknown>[] = []
    const sources: Record<string, unknown>[] = []
    for (const r of chunk) {
      const id = ids.get(String(r.external_id))
      if (!id) continue
      ;(r.hours as { days: string; time: string }[]).forEach((h, n) => hours.push({ parent: id, order: n + 1, days: h.days, time: h.time }))
      sources.push({ parent: id, order: 1, label: r.source_label, url: r.url })
    }
    for (const [table, list] of [['places_hours', hours], ['places_sources', sources]] as const) {
      if (!list.length) continue
      const cols = table === 'places_hours' ? sql`days, time` : sql`label, url`
      const pick = table === 'places_hours' ? sql`x.days, x.time` : sql`x.label, x.url`
      await db.execute(sql`
        INSERT INTO ${sql.raw(table)} (_order, _parent_id, id, ${cols})
        SELECT x.order, x.parent, substr(md5(random()::text || clock_timestamp()::text), 1, 24), ${pick}
        FROM jsonb_to_recordset(${JSON.stringify(list)}::jsonb) AS x("order" int, parent int, days text, time text, label text, url text)`)
    }
  }
}

export async function importPlaces(payload: Payload, req: PayloadRequest | undefined, records: ImportRecord[], db?: Db) {
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
  const pending: Record<string, unknown>[] = []
  for (const r of records) {
    const wilaya = code(r.wilaya)
    // Lieux exclus de DALIL (musique, zaouïas, chiisme, alcool) : jamais importés.
    if (!wilaya || !r.name || !r.city && !r.wilaya || exclusionReason(r)) {
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
    if (byExternal.has(r.id)) {
      skipped++ // déjà importée depuis cette source : rien à refaire
      continue
    }
    if (id === -1) {
      skipped++ // doublon dans le même lot
      continue
    }
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
      if (db) {
        pending.push({
          name: r.name, name_ar: facts.nameAr ?? null, sector: r.sector, category: r.category, intro: facts.intro ?? null, inception: facts.inception ?? null,
          wilaya, city, address: facts.address ?? null, lat: facts.lat ?? null, lng: facts.lng ?? null, phone: facts.phone ?? null, email: facts.email ?? null,
          website: facts.website ?? null, show_contacts: Boolean(r.publicBody), slug, provider: r.provider, external_id: r.id, url: r.sourceUrl, notes: r.note ?? null,
          hours: facts.hours ?? [], source_label: facts.sources[0].label,
          score: scorePlace({ verification: 'spotted', intro: facts.intro, lat: facts.lat, lng: facts.lng, hours: facts.hours, phone: facts.phone, website: facts.website }),
        })
        byExternal.set(r.id, -1)
        byName.set(`${key(r.name)}|${wilaya}`, -1)
        created++
        continue
      }
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
  if (pending.length && db) await bulkCreate(db, pending)
  payload.logger.info(`Import des fiches : ${created} créées, ${completed} complétées, ${skipped} ignorées`)
  return { created, completed, skipped }
}
