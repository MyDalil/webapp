import type { Metadata } from 'next'
import { getPage, type Node } from '@/content'
import { SECTORS } from '@/content/catalog'
import { LISTINGS, cityPhoto } from '@/content/listings'
import { Directory } from '@/components/Directory'
import { Tree } from '@/components/Tree'

export const metadata: Metadata = {
  title: 'Annuaire & Adresses',
  description: 'Des lieux utiles et des professionnels présentés avec des critères lisibles, secteur par secteur.',
}

const cls = (n: Node) => (Array.isArray(n) && n[0] === 'el' ? String(n[2].className ?? '') : '')

export default async function AnnuairePage() {
  const page = await getPage('/annuaire')
  const sectors = (page?.content ?? []).filter((n) => !cls(n).includes('subpage-hero'))
  const photos = Object.fromEntries(LISTINGS.map((l) => [l.slug, cityPhoto(l.city)]))
  return (
    <>
      <section className="page-intro container compact">
        <p className="eyebrow">Annuaire &amp; Adresses</p>
        <h1>Trouvez une adresse qui vous correspond.</h1>
        <p>Des lieux utiles et des professionnels présentés avec des critères lisibles. Choisissez un secteur ou recherchez directement.</p>
      </section>
      <Directory listings={LISTINGS} sectors={SECTORS.map(({ slug, title }) => ({ slug, title }))} photos={photos} />
      <div className="legacy">
        <Tree nodes={sectors} />
      </div>
    </>
  )
}
