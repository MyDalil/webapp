import { isLang } from '@/platform/i18n'
import type { Metadata } from 'next'
import Link from '@/platform/ui/Link'
import { notFound } from 'next/navigation'
import { categoryLabel, currentMember, getClassified } from '@/modules/annonces'
import { ClassifiedChat, Gallery, ReportForm } from '@/modules/annonces/ui'
import { PlaceActions } from '@/modules/annuaire/ui'
import { JsonLd } from '@/platform/seo/JsonLd'
import { breadcrumbJsonLd, classifiedJsonLd } from '@/platform/seo/jsonLd'
import { absoluteAsset, absoluteUrl, asLang, factualDescription, ficheMetadata } from '@/platform/seo/metadata'
import { withSectionGate } from '@/platform/ui/SectionGate'

/**
 * Reste dynamique : la lecture de l’annonce dépend du visiteur (l’auteur voit la sienne en attente ou refusée,
 * avec son bandeau et son bloc « C’est votre annonce »). Passer en ISR demande une lecture publique sans session
 * et un îlot client pour l’auteur — voir le rapport du lot A2. Les pages sont déjà rafraîchies à la publication (refresh.ts).
 */
export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ categorie: string; slug: string; lang: string }> }

const day = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))
const since = (iso: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date(iso))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang } = await params
  const a = await getClassified(slug, isLang(lang) ? lang : undefined)
  return a
    ? {
        ...ficheMetadata({ lang: asLang(lang), path: `/annonces/${a.category}/${a.slug}`, title: `${a.title} — ${a.price} · ${a.place}`, description: factualDescription([a.description]) }),
        robots: a.status === 'published' && !a.example ? undefined : { index: false },
      }
    : {}
}

async function AnnoncePage({ params }: Props) {
  const { categorie, slug, lang } = await params
  const a = await getClassified(slug, isLang(lang) ? lang : undefined)
  if (!a || a.category !== categorie) notFound()
  const me = await currentMember()
  const back = `/annonces/${a.category}`
  const L = asLang(lang)
  const url = absoluteUrl(L, `/annonces/${a.category}/${a.slug}`)
  // Données structurées pour une annonce publique seulement (jamais une annonce d’exemple ou en attente).
  const jsonLd =
    a.status === 'published' && !a.example
      ? [
          classifiedJsonLd({
            title: a.title,
            url,
            lang: L,
            category: a.category,
            subLabel: a.subLabel,
            description: a.description,
            images: a.gallery.map((g) => absoluteAsset(g.cover || g.thumb)),
            place: a.place,
            publishedAt: a.publishedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Annonces', url: absoluteUrl(L, '/annonces') },
            { name: categoryLabel(a.category), url: absoluteUrl(L, back) },
            { name: a.title, url },
          ]),
        ]
      : null
  return (
    <div className="praticien-page container classified-page">
      {jsonLd && <JsonLd data={jsonLd} />}
      <Link className="back-link" href={back}>
        ← {categoryLabel(a.category)}
      </Link>
      {a.mine && a.status !== 'published' && (
        <p className="praticien-notice">
          Votre annonce n’est pas visible : {a.statusLabel.toLowerCase()}. <Link href="/mon-compte#annonces">Mes annonces</Link>
        </p>
      )}
      <div className="praticien-layout">
        <div className="praticien-main">
          <Gallery photos={a.gallery} title={a.title} />
          <header className="classified-head">
            <span className={`chip ${a.example ? 'chip-example' : ''}`}>{a.example ? `Exemple · ${a.subLabel}` : a.subLabel}</span>
            <h1>{a.title}</h1>
            <p className="classified-price">{a.price}</p>
            <p className="muted-line">
              {a.place}
              {a.publishedAt ? ` · publiée le ${day(a.publishedAt)}` : ''}
            </p>
          </header>
          {!!a.facts.length && (
            <section className="account-block praticien-facts">
              <h2>Caractéristiques</h2>
              <dl>
                {a.facts.map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section className="account-block">
            <h2>Description</h2>
            <p className="praticien-bio">{a.description}</p>
          </section>
          <section className="account-block classified-safety">
            <h2>Sécurité</h2>
            <ul>
              <li>Ne payez jamais à l’avance sans avoir vu le bien ou rencontré la personne.</li>
              <li>Rencontrez-vous dans un lieu public. Vérifiez les papiers d’un véhicule ou d’un logement.</li>
              {a.category === 'emploi' && <li>Un employeur sérieux ne demande jamais d’argent à un candidat.</li>}
            </ul>
            {!a.mine && !a.example && a.status === 'published' && <ReportForm id={a.id} />}
          </section>
        </div>
        <aside className="praticien-aside">
          <section className="account-block classified-seller">
            <h2>{a.author.name}</h2>
            <p className="muted-line">
              {a.author.kind === 'pro' ? 'Professionnel' : 'Particulier'} · membre depuis {since(a.author.since)}
            </p>
            {/* Pas de téléphone public : les échanges passent par la messagerie DALIL (règle du module annonces). */}
            {a.status === 'published' && !a.example && (
              <div className="pl-actions">
                <PlaceActions name={a.title} />
              </div>
            )}
          </section>
          {a.example ? (
            <section className="account-block classified-example">
              <h2>Annonce d’exemple</h2>
              <p>Elle montre à quoi ressemble une annonce DALIL. Elle ne peut pas être contactée et disparaît dès qu’une vraie annonce est publiée dans ce type.</p>
              <Link className="button primary" href={`/annonces/deposer?categorie=${a.category}`}>
                Déposer une vraie annonce
              </Link>
            </section>
          ) : a.mine ? (
            <section className="account-block">
              <h2>C’est votre annonce</h2>
              <p className="muted-line">Les messages reçus sont dans votre espace.</p>
              <Link className="button primary" href="/mon-compte#annonces">
                Mes annonces et messages
              </Link>
            </section>
          ) : (
            <ClassifiedChat id={a.id} other={a.author.name} signedIn={!!me} loginHref={`/connexion/particulier?next=${encodeURIComponent(`/annonces/${a.category}/${a.slug}#contact`)}`} closed={a.status !== 'published'} />
          )}
        </aside>
      </div>
    </div>
  )
}

export default withSectionGate(AnnoncePage, (p) => `/annonces/${p.categorie}/${p.slug}`)
