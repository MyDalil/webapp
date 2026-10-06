import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import listings from '../content/listings.json'

type Listing = (typeof listings)[number]

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : null

/** Reprend les adresses du prototype dans la collection « Adresses » (une seule fois, base vide). */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const { totalDocs } = await payload.count({ collection: 'places', req, overrideAccess: true })
  if (totalDocs > 0) return
  for (const l of listings as Listing[]) {
    const seen = fmt(l.updated)
    await payload.create({
      collection: 'places',
      req,
      overrideAccess: true,
      context: { skipRevalidate: true },
      data: {
        _status: 'published',
        name: l.name,
        slug: l.slug,
        sector: l.sector as never,
        category: l.category,
        intro: l.intro,
        city: l.city,
        wilaya: l.city === 'Alger' ? '16' : l.city === 'Oran' ? '31' : l.city === 'Constantine' ? '25' : l.city === 'Annaba' ? '23' : l.city === 'Tlemcen' ? '13' : l.city === 'Béjaïa' ? '6' : undefined,
        place: l.place,
        verification: 'spotted',
        criteria: l.criteria.map(([criterion]) => ({ criterion, result: 'pending' as const })),
        sources: l.source ? [{ label: seen ? `Source consultée le ${seen}` : 'Source', url: l.source }] : [],
      },
    })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({
    collection: 'places',
    req,
    overrideAccess: true,
    where: { slug: { in: (listings as Listing[]).map((l) => l.slug) } },
  })
}
