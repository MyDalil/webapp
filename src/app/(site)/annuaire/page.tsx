import type { Metadata } from 'next'
import { getPage, type Node } from '@/content'
import { SECTORS } from '@/content/catalog'
import { getPlaces } from '@/lib/places'
import { Directory } from '@/components/Directory'
import { Tree } from '@/components/Tree'

export const metadata: Metadata = {
  title: 'Annuaire & Adresses',
  description: 'Des lieux utiles et des professionnels présentés avec des critères lisibles, secteur par secteur.',
}

/** Rafraîchi à chaque enregistrement dans /admin ; filet de sécurité toutes les 5 minutes. */
export const revalidate = 300

const cls = (n: Node) => (Array.isArray(n) && n[0] === 'el' ? String(n[2].className ?? '') : '')

export default async function AnnuairePage() {
  const [page, places] = await Promise.all([getPage('/annuaire'), getPlaces()])
  const sectors = (page?.content ?? []).filter((n) => !cls(n).includes('subpage-hero'))
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">Annuaire &amp; Adresses</p>
        <h1>Trouvez une adresse qui vous correspond.</h1>
        <p>Des lieux utiles et des professionnels présentés avec des critères lisibles. Choisissez un secteur ou recherchez directement.</p>
      </section>
      <Directory places={places} sectors={SECTORS.map(({ slug, title, categories }) => ({ slug, title, categories }))} />
      <div className="legacy">
        <Tree nodes={sectors} />
      </div>
    </>
  )
}
