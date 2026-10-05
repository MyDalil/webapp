import Link from 'next/link'
import { getPage, type Node } from '@/content'
import { Tree } from '@/components/Tree'
import { HomeSearch } from '@/components/HomeSearch'
import { Icon } from '@/components/Icon'

/** Sections du prototype reprises sous le hero de la maquette (le hero et les raccourcis d’origine sont remplacés). */
const SKIP = ['stitch-hero', 'home-metrics']
const cls = (n: Node) => (Array.isArray(n) && n[0] === 'el' ? String(n[2].className ?? '') : '')

export default async function Home() {
  const page = await getPage('/')
  const legacy = (page?.content ?? []).filter((n) => !SKIP.some((s) => cls(n).includes(s)))
  return (
    <>
      <section className="hero home-hero">
        <div className="hero-photo photo-algiers" aria-hidden="true"></div>
        <div className="hero-shade"></div>
        <div className="hero-content container">
          <p className="eyebrow inverse">Votre guide de l’Algérie</p>
          <h1>L’Algérie, plus proche de vous.</h1>
          <p>Découvrez, préparez, vivez, partagez.</p>
          <HomeSearch />
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <div>
            <p className="eyebrow">À votre rythme</p>
            <h2>Que souhaitez-vous faire aujourd’hui ?</h2>
            <p>DALIL vous conduit directement vers l’information utile.</p>
          </div>
        </div>
        <div className="intent-grid">
          <Link className="intent-card" href="/explorer">
            <span>
              <Icon name="pin" />
            </span>
            <h3>Explorer l’Algérie</h3>
            <p>Villes, activités, culture, gastronomie et événements.</p>
            <b>
              Découvrir <Icon name="arrow" />
            </b>
          </Link>
          <Link className="intent-card" href="/installation">
            <span>
              <Icon name="home" />
            </span>
            <h3>S’installer &amp; Vivre</h3>
            <p>Logement, école, santé, transport et vie quotidienne.</p>
            <b>
              Préparer mon parcours <Icon name="arrow" />
            </b>
          </Link>
          <Link className="intent-card" href="/demarches">
            <span>
              <Icon name="file" />
            </span>
            <h3>Faire une démarche</h3>
            <p>Documents, coûts, délais et sources officielles.</p>
            <b>
              Accéder aux démarches <Icon name="arrow" />
            </b>
          </Link>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Sélections DALIL</p>
              <h2>Des lieux qui méritent votre temps.</h2>
              <p>Des informations claires, datées et vérifiables.</p>
            </div>
            <Link className="button outline" href="/annuaire">
              Voir tout l’annuaire
            </Link>
          </div>
          <div className="destination-grid">
            {(
              [
                ['Alger', 'La Méditerranée au quotidien', 'algiers'],
                ['Constantine', 'Ponts, histoire et caractère', 'constantine'],
                ['Oran', 'Mer, culture et énergie', 'oran'],
                ['Tassili n’Ajjer', 'Le Sahara monumental', 'tassili'],
              ] as const
            ).map(([name, copy, img]) => (
              <Link key={name} className="destination-card" href={`/recherche?q=${encodeURIComponent(name)}`}>
                <div className={`photo photo-${img}`} role="img" aria-label={name}></div>
                <div>
                  <h3>{name}</h3>
                  <p>{copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="legacy">
        <Tree nodes={legacy} />
      </div>
    </>
  )
}
