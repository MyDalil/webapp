import Link from 'next/link'
import { notFound } from 'next/navigation'
import { searchPlaces } from '@/modules/annuaire'
import { Directory } from '@/modules/annuaire/ui'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { categoryBySlug, categoryPath, wilayaBySlug } from '@/platform/referentiel/slug'

/**
 * Page d’une catégorie de l’annuaire, nationale ou dans une wilaya (référencement : « Hôpitaux à Oran »).
 * Jamais vide (décision de Rad, 2026-10-26) : sans adresse ici, la catégorie dans tout le pays, puis la rubrique.
 */
export async function CategoryPage({ sector, categorie, wilaya }: { sector: string; categorie: string; wilaya?: string }) {
  const found = categoryBySlug(sector, categorie)
  const w = wilaya ? wilayaBySlug(wilaya) : null
  if (!found || (wilaya && !w)) notFound()
  const { sector: s, category } = found
  const here = await searchPlaces({ sector: s.slug, category, wilaya: w ? String(w.code) : undefined })
  const national = w && !here.total ? await searchPlaces({ sector: s.slug, category }) : null
  const fallback = !here.total && !national?.total ? await searchPlaces({ sector: s.slug }) : null
  const shown = here.total ? here : national?.total ? national : fallback!
  const wilayas = [...new Set((national ?? here).places.map((p) => p.wilaya).filter(Boolean))]
    .map((name) => WILAYAS.find((x) => x.name === name))
    .filter((x): x is (typeof WILAYAS)[number] => Boolean(x) && !x!.transition)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">
          <Link href="/annuaire">Annuaire</Link> › <Link href={`/annuaire/${s.slug}`}>{s.title}</Link>
          {w && (
            <>
              {' '}
              › <Link href={categoryPath(s.slug, category)}>{category}</Link>
            </>
          )}
        </p>
        <h1>{w ? `${category} — ${w.name}` : `${category} en Algérie`}</h1>
        <p>
          {here.total
            ? `${here.total} adresse${here.total > 1 ? 's' : ''} ${w ? `dans la wilaya de ${w.name}` : 'référencées'}, avec leur source et leur statut de vérification.`
            : national?.total
              ? `Pas encore d’adresse « ${category} » dans la wilaya de ${w!.name}. Voici celles du reste du pays.`
              : `Pas encore d’adresse « ${category} ». Voici les autres adresses de la rubrique ${s.title}.`}
        </p>
        {!!wilayas.length && (
          <nav className="activity-chips" aria-label="Par wilaya">
            {wilayas.slice(0, 30).map((x) => (
              <Link key={x.code} className={`chip ${w?.code === x.code ? '' : 'chip-plain'}`} href={categoryPath(s.slug, category, x.code)}>
                {x.name}
              </Link>
            ))}
          </nav>
        )}
      </section>
      <Directory
        places={shown.places}
        total={shown.total}
        sectors={[{ slug: s.slug, title: s.title, categories: s.categories }]}
        initialSector={s.slug}
        lockSector
        initialCategory={here.total || national?.total ? category : ''}
        initialWilaya={here.total && w ? w.name : ''}
      />
    </>
  )
}
