import { searchPlaces } from '@/modules/annuaire'

/** Recherche de l’annuaire côté serveur (secteur, spécialité, wilaya, texte, coups de cœur) : 400 fiches max, classées. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams
  const pick = (k: string) => (u.get(k) ?? '').slice(0, 80) || undefined
  const data = await searchPlaces({ sector: pick('sector'), category: pick('category'), wilaya: pick('wilaya'), q: pick('q'), favorite: u.get('coeur') === '1' })
  return Response.json(data, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
