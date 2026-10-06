import type { Metadata } from 'next'
import Link from 'next/link'
import { SECTORS } from '@/platform/referentiel/catalog'
import { getPlaces } from '@/modules/annuaire'
import { Directory } from '@/modules/annuaire/ui'

export const metadata: Metadata = {
  title: 'Annuaire & Adresses',
  description: 'Des lieux utiles et des professionnels présentés avec des critères lisibles, secteur par secteur.',
}

/** Rafraîchi à chaque enregistrement dans /admin ; filet de sécurité toutes les 5 minutes. */
export const revalidate = 300

export default async function AnnuairePage() {
  const places = await getPlaces()
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">Annuaire &amp; Adresses</p>
        <h1>Trouvez une adresse qui vous correspond.</h1>
        <p>Des lieux utiles et des professionnels présentés avec des critères lisibles. Choisissez un secteur ou recherchez directement.</p>
      </section>
      <Directory places={places} sectors={SECTORS.map(({ slug, title, categories }) => ({ slug, title, categories }))} />
      {/* Cartes secteurs du prototype (même balisage), générées depuis le catalogue pour rester synchronisées. */}
      <div className="legacy">
        <section className="shell discovery-grid">
          {SECTORS.map((s, i) => (
            <article key={s.slug}>
              <span className="section-label">{String(i + 1).padStart(2, '0')}</span>
              <h2>
                <Link href={`/annuaire/${s.slug}`}>{s.title}</Link>
              </h2>
              <p>{s.description}</p>
              <ul>
                {s.categories.map((c) => (
                  <li key={c}>
                    <Link href={`/annuaire/${s.slug}?category=${encodeURIComponent(c)}`}>
                      {c}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </>
  )
}
