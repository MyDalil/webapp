/**
 * Seed idempotent : secteurs, spécialités, wilayas, guides, pages, accueil.
 * Lancer : pnpm seed  (DATABASE_URL doit pointer vers la base cible)
 * Ne crée aucun compte : le premier administrateur se crée sur /admin.
 */
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { SECTORS, WILAYAS, FEATURED_WILAYAS } from './taxonomy'
import { GUIDES } from './guides'
import { PAGES } from './pages'
import { lexical } from './lexical'
import { slugify } from '@/lib/normalize'

const ctx = { disableRevalidate: true }
type Loc = 'fr' | 'en' | 'ar'

async function upsert(p: Payload, collection: 'sectors' | 'specialties' | 'wilayas' | 'guides' | 'pages', slug: string, byLocale: Partial<Record<Loc, Record<string, unknown>>>, draft = false) {
  const found = await p.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true, overrideAccess: true })
  let id = found.docs[0]?.id as number | undefined
  for (const locale of ['fr', 'en', 'ar'] as Loc[]) {
    const data = byLocale[locale]
    if (!data) continue
    if (!id) {
      const created = await p.create({ collection, locale, data: { ...data, slug } as never, draft, overrideAccess: true, context: ctx })
      id = created.id as number
    } else {
      await p.update({ collection, id, locale, data: data as never, draft, overrideAccess: true, context: ctx })
    }
  }
  return id!
}

async function run() {
  const p = await getPayload({ config })
  p.logger.info('Seed DALIL…')

  // Wilayas
  for (const [code, fr, ar] of WILAYAS) {
    await upsert(p, 'wilayas', slugify(fr), {
      fr: { code, name: fr, featured: FEATURED_WILAYAS.includes(code) },
      en: { name: fr === 'Alger' ? 'Algiers' : fr },
      ar: { name: ar },
    })
  }
  p.logger.info(`✓ ${WILAYAS.length} wilayas`)

  // Guides (avant les secteurs, qui y font référence)
  const guideIds = new Map<string, number>()
  for (const [i, g] of GUIDES.entries()) {
    const status = g.approved ? 'published' : 'draft'
    const id = await upsert(
      p,
      'guides',
      g.slug,
      {
        fr: { title: g.title.fr, summary: g.summary.fr, theme: g.theme, order: i, checklist: g.steps.map((text) => ({ text })), _status: status },
        en: { title: g.title.en, summary: g.summary.en, _status: status },
        ar: { title: g.title.ar, summary: g.summary.ar, _status: status },
      },
      !g.approved,
    )
    guideIds.set(g.slug, id)
  }
  p.logger.info(`✓ ${GUIDES.length} guides (${GUIDES.filter((g) => !g.approved).length} brouillons à valider)`)

  // Secteurs + spécialités
  let nSpec = 0
  for (const [i, s] of SECTORS.entries()) {
    const sectorId = await upsert(p, 'sectors', s.slug, {
      fr: { title: s.title.fr, intro: s.intro.fr, icon: s.icon, order: i + 1, criteria: s.criteria.map((label) => ({ label })), guide: s.guide ? guideIds.get(s.guide) : undefined },
      en: { title: s.title.en, intro: s.intro.en },
      ar: { title: s.title.ar, intro: s.intro.ar },
    })
    for (const [j, [slug, title]] of s.specialties.entries()) {
      await upsert(p, 'specialties', slug, {
        fr: { title: title.fr, sector: sectorId, order: j },
        en: { title: title.en },
        ar: { title: title.ar },
      })
      nSpec++
    }
  }
  p.logger.info(`✓ ${SECTORS.length} secteurs, ${nSpec} spécialités`)

  // Pages
  for (const pg of PAGES) {
    await upsert(
      p,
      'pages',
      pg.slug,
      { fr: { title: pg.title, intro: pg.intro, body: lexical(pg.body), _status: pg.publish ? 'published' : 'draft' } },
      !pg.publish,
    )
  }
  p.logger.info(`✓ ${PAGES.length} pages (${PAGES.filter((x) => !x.publish).length} brouillons juridiques à compléter)`)

  // Accueil
  const featured = ['preparer-son-installation', 'sorties-en-famille', 'restaurants', 'ecole-et-famille', 'documents-et-demarches', 'logement']
    .map((s) => guideIds.get(s))
    .filter(Boolean) as number[]
  await p.updateGlobal({
    slug: 'home',
    locale: 'fr',
    data: {
      featuredGuides: featured,
      suggestions: [{ text: 'Une sortie en famille' }, { text: 'Un restaurant à Alger' }, { text: 'Une école pour mes enfants' }, { text: 'Pharmacies' }],
    },
    context: ctx,
  })
  const home = await p.findGlobal({ slug: 'home', locale: 'fr', depth: 0 })
  const ids = (home.suggestions ?? []).map((s) => s.id)
  const en = ['A family outing', 'A restaurant in Algiers', 'A school for my children', 'Pharmacies']
  const ar = ['خرجة عائلية', 'مطعم في العاصمة', 'مدرسة لأطفالي', 'صيدليات']
  await p.updateGlobal({ slug: 'home', locale: 'en', data: { suggestions: ids.map((id, i) => ({ id, text: en[i] })) }, context: ctx })
  await p.updateGlobal({ slug: 'home', locale: 'ar', data: { suggestions: ids.map((id, i) => ({ id, text: ar[i] })) }, context: ctx })
  p.logger.info('✓ Accueil')
  p.logger.info('Seed terminé.')
  process.exit(0)
}

try {
  await run()
} catch (e) {
  console.error(e)
  process.exit(1)
}
