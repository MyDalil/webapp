import { getFeaturedDestination, getPlaces, getShowcase } from '@/modules/annuaire'

export const revalidate = 300

type Slide = { photo: string; place: string; href: string; credit: string | null }

/** Photos « à la une » des méga-menus : uniquement des photos de fiches DALIL publiées (sous licence, auteur affiché). */
export async function GET() {
  const [{ top, cities }, all, destination] = await Promise.all([getShowcase(), getPlaces(), getFeaturedDestination()])
  const pick = (list: { cover: string; credit: string | null; name: string; href: string }[], n = 3): Slide[] =>
    list.filter((x) => x.cover && !x.cover.startsWith('/mockup')).slice(0, n).map((x) => ({ photo: x.cover, place: x.name, href: x.href, credit: x.credit }))
  const places = (l: typeof top) => l.map((p) => ({ cover: p.cover, credit: p.credit, name: p.name, href: `/adresses/${p.slug}` }))
  const towns = cities.map((c) => ({ cover: c.cover, credit: c.credit, name: c.name, href: `/villes/${c.slug}` }))
  const mosques = all.filter((p) => p.category === 'Mosquées' && p.cover && !p.cover.startsWith('/mockup'))
  return Response.json(
    {
      // Découvrir : la destination à l’honneur en premier.
      decouvrir: pick(places(destination ? [destination.place, ...top.filter((p) => p.slug !== destination.place.slug)] : top)),
      vivre: pick(towns),
      demarches: pick(towns.slice(3)),
      services: pick(places(top.slice(3))),
      musulmane: pick(places(mosques)),
      plus: pick(places(top.slice(6))),
    },
    { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  )
}
