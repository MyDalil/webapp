import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from '@/platform/ui/Link'
import { DEMARCHES, THEMES, listProcedures, themeByKey } from '@/modules/contenus'
import { ProcedureRows } from '@/modules/contenus/ui'
import { XpHero } from '@/platform/ui/Xp'
import { PHOTOS } from '@/platform/referentiel/photos'

type Props = { params: Promise<{ theme: string }> }
export const revalidate = 3600
export const generateStaticParams = () => THEMES.map((t) => ({ theme: t.key }))

/** Fiches phares déjà rédigées, rattachées à leur thème. */
const FEATURED: Record<string, string[]> = { identite: ['passeport'], entreprise: ['auto-entrepreneur'], 'voyage-circulation': ['ccr'], 'consulaire-diaspora': ['ccr'] }
const HERO: Record<string, keyof typeof PHOTOS> = { identite: 'passeport', 'consulaire-diaspora': 'ambassade', entreprise: 'epices', 'education-diplomes': 'universite', sante: 'pharmacie' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = themeByKey((await params).theme)
  return t ? { title: `${t.label} — démarches en Algérie · DALIL`, description: `${t.lead} Liens directs vers les sites officiels, pièces, coûts et sources datées.` } : {}
}

/** Toutes les démarches d’un thème : en ligne d’abord, chacune avec son lien direct vers le site officiel. */
export default async function ThemePage({ params }: Props) {
  const t = themeByKey((await params).theme)
  if (!t) notFound()
  const items = (await listProcedures(t.key)).sort((a, b) => Number(Boolean(b.online)) - Number(Boolean(a.online)) || a.title.localeCompare(b.title, 'fr'))
  const featured = DEMARCHES.filter((d) => FEATURED[t.key]?.includes(d.slug))
  const photo = PHOTOS[HERO[t.key] ?? 'grande-poste']
  return (
    <div className="xp">
      <XpHero compact photo={photo.src} credit={photo.credit} eyebrow="Démarches" title={t.label} lead={t.lead} back={{ href: '/demarches', label: 'Toutes les démarches' }} />
      <div className="container xp-narrow xp-body">
        {!!featured.length && (
          <section className="sr-group">
            <h2>Guides complets</h2>
            <p className="section-lead">Étape par étape, avec les pièces et les sources.</p>
            <ul className="sr-list">
              {featured.map((d) => (
                <li key={d.slug}>
                  <Link href={`/demarches/${d.slug}`} className="sr-row is-wrap">
                    <span className="sr-icon" aria-hidden="true">★</span>
                    <span className="sr-text">
                      <b>{d.title}</b>
                      <small>{d.summary}</small>
                    </span>
                    <span />
                    <span className="sr-chev" aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="sr-group">
          <h2>Toutes les démarches</h2>
          <p className="section-lead">Les démarches faisables en ligne sont en premier, avec un accès direct au site officiel.</p>
          {items.length ? <ProcedureRows items={items} /> : <p className="sr-note">Les démarches de ce thème arrivent. En attendant, consultez les sites officiels sur la page Démarches.</p>}
        </section>
        {t.key === 'consulaire-diaspora' && (
          <p className="sr-note">
            Pour trouver votre consulat : <Link href="/demarches/consulats">ambassades et consulats d’Algérie dans le monde</Link>.
          </p>
        )}
        <p className="sr-note">Les démarches sont gratuites sur les sites de l’État. DALIL ne vous demande jamais vos identifiants ni vos codes.</p>
      </div>
    </div>
  )
}
