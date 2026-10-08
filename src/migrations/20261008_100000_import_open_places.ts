import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import selected from '@/modules/annuaire/data/open-places-selected.json'

type Item = (typeof selected)[number]

/**
 * Importe les lieux issus de sources ouvertes (Wikidata CC0, photos Wikimedia Commons
 * sous licence libre, textes rédigés par DALIL). Idempotent : mise à jour par identifiant
 * Wikidata. Statut honnête « Repérée — à vérifier ». Calcule aussi le score des fiches existantes.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const ctx = { skipRevalidate: true }
  for (const p of selected as Item[]) {
    const data = {
      _status: 'published' as const,
      name: p.name,
      nameAr: p.nameAr ?? undefined,
      nameEn: p.nameEn ?? undefined,
      sector: p.sector as never,
      category: p.category,
      intro: p.intro,
      wilaya: p.wilaya as never,
      city: p.city,
      place: p.city,
      lat: p.coord?.lat,
      lng: p.coord?.lng,
      website: p.website ?? undefined,
      heritage: p.heritage ?? undefined,
      inception: p.inception ?? undefined,
      wikipedia: p.wikipedia ?? undefined,
      externalPhotos: p.photos.map((x) => ({ url: x.url, author: x.author, license: x.license, licenseUrl: x.licenseUrl ?? undefined, page: x.page, width: x.width, height: x.height })),
      verification: 'spotted' as const,
      sources: [
        { label: 'Wikidata', url: `https://www.wikidata.org/wiki/${p.id}` },
        ...(p.wikipedia ? [{ label: 'Wikipédia', url: p.wikipedia }] : []),
        ...(p.website ? [{ label: 'Site officiel', url: p.website }] : []),
      ],
      source: { provider: 'wikidata' as const, externalId: p.id, url: `https://www.wikidata.org/wiki/${p.id}`, notoriety: p.notoriety, notes: p.notes ?? undefined },
    }
    const { docs } = await payload.find({ collection: 'places', req, overrideAccess: true, limit: 1, where: { 'source.externalId': { equals: p.id } } })
    if (docs[0]) {
      await payload.update({ collection: 'places', id: docs[0].id, req, overrideAccess: true, context: ctx, data })
      continue
    }
    // Adresse de page unique : nom + commune, suffixée par l’identifiant en cas de collision.
    const slug = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const base = slug(p.name).includes(slug(p.city)) ? slug(p.name) : slug(`${p.name} ${p.city}`)
    const taken = await payload.count({ collection: 'places', req, overrideAccess: true, where: { slug: { equals: base } } })
    await payload.create({ collection: 'places', req, overrideAccess: true, context: ctx, data: { ...data, slug: taken.totalDocs ? `${base}-${p.id.toLowerCase()}` : base } })
  }
  // Score des fiches déjà présentes (adresses reprises du prototype).
  const { docs: rest } = await payload.find({ collection: 'places', req, overrideAccess: true, limit: 1000, where: { score: { exists: false } } })
  for (const d of rest) await payload.update({ collection: 'places', id: d.id, req, overrideAccess: true, context: ctx, data: {} })
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'places', req, overrideAccess: true, where: { 'source.provider': { equals: 'wikidata' } } })
}
