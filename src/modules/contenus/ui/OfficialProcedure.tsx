import Link from '@/platform/ui/Link'
import { Icon } from '@/platform/ui/Icon'
import { XpHero } from '@/platform/ui/Xp'
import type { Procedure } from '@/payload-types'
import { themeByKey } from '../officiel/themes'
import { themePhoto } from '../officiel/photos'

const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const host = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

/** Fiche d’une démarche officielle : à quoi elle sert, le lien direct vers le site officiel, puis le détail sourcé. */
export function OfficialProcedure({ p }: { p: Procedure }) {
  const theme = themeByKey(p.theme)
  const photo = themePhoto(p.theme)
  const checked = p.sources?.map((s) => s.checked).sort().at(-1)
  const keys = [
    p.online ? { icon: 'check', label: 'En ligne', value: p.platform || (p.onlineUrl ? host(p.onlineUrl) : 'Oui') } : { icon: 'building', label: 'Sur place', value: p.where || 'Au guichet compétent' },
    p.cost ? { icon: 'cash', label: 'Coût', value: p.cost } : null,
    p.delay ? { icon: 'clock', label: 'Délai', value: p.delay } : null,
    p.online && p.where ? { icon: 'pin', label: 'Où', value: p.where } : null,
  ].filter(Boolean) as { icon: string; label: string; value: string }[]
  return (
    <article className="xp">
      <XpHero compact photo={photo.src} credit={photo.credit} eyebrow={`Démarche · ${theme?.label ?? ''}`} title={p.title} lead={p.summary} back={{ href: `/demarches/theme/${p.theme}`, label: theme?.label ?? 'Démarches' }}>
        {checked && <p className="ac-badge is-light">Vérifiée le {dateFr(checked)}</p>}
      </XpHero>
      <div className="container xp-narrow xp-body">
        {p.online && p.onlineUrl && (
          <div className="op-cta">
            <div>
              <b>Faites la démarche en ligne</b>
              <small>Sur le site officiel {p.platform ? `« ${p.platform} »` : host(p.onlineUrl)}. Gratuit. DALIL ne vous demande jamais vos identifiants.</small>
            </div>
            <a className="sr-pill is-primary" href={p.onlineUrl} target="_blank" rel="noopener noreferrer">
              Ouvrir le site officiel ↗
            </a>
          </div>
        )}

        <section className="sr-group" aria-label="Points clés">
          <h2>Points clés</h2>
          <p className="section-lead">L’essentiel avant de commencer.</p>
          <ul className="dm-keys swipe">
            {keys.map((k, i) => (
              <li key={k.label}>
                <span className={`dm-key-icon is-${['ciel', 'sable', 'violet', 'vert'][i % 4]}`}>
                  <Icon name={k.icon} />
                </span>
                <small>{k.label}</small>
                <b>{k.value}</b>
              </li>
            ))}
          </ul>
        </section>

        {!!p.steps?.length && (
          <section className="sr-group" aria-label="Étapes">
            <h2>Étapes</h2>
            <p className="section-lead">Dans l’ordre, de la préparation au retrait.</p>
            <ol className="ac-steps">
              {p.steps.map((s) => (
                <li key={s.id ?? s.text}>{s.text}</li>
              ))}
            </ol>
          </section>
        )}

        {!!p.documents?.length && (
          <section className="sr-group" aria-label="Pièces à fournir">
            <h2>Pièces à fournir</h2>
            <p className="section-lead">À réunir avant de remplir le formulaire ou de vous déplacer.</p>
            <ul className="ac-facts">
              {p.documents.map((s) => (
                <li key={s.id ?? s.text}>{s.text}</li>
              ))}
            </ul>
          </section>
        )}

        {!!(p.forms?.length || p.laws?.length) && (
          <section className="sr-group" aria-label="Documents officiels">
            <h2>Formulaires et textes officiels</h2>
            <p className="section-lead">Les originaux, sur les sites de l’État.</p>
            <ul className="sr-list">
              {[...(p.forms ?? []).map((f) => ({ ...f, kind: 'Formulaire' })), ...(p.laws ?? []).map((f) => ({ ...f, kind: 'Texte de loi' }))].map((f) => (
                <li key={f.url}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="sr-row is-wrap">
                    <span className="sr-icon" aria-hidden="true">
                      <Icon name="file" />
                    </span>
                    <span className="sr-text">
                      <b>{f.title}</b>
                      <small>
                        {f.kind} · <span className="sr-site">{host(f.url)} ↗</span>
                      </small>
                    </span>
                    <span />
                    <span className="sr-chev" aria-hidden="true">
                      ›
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="sr-group" aria-label="Sources">
          <h2>Sources</h2>
          <p className="section-lead">Chaque information vient d’un site officiel, avec sa date de consultation.</p>
          <ol className="ac-sources">
            {(p.sources ?? []).map((s, i) => (
              <li key={s.id ?? s.url} id={`source-${i + 1}`}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>{' '}
                <small>· consultée le {dateFr(s.checked)}</small>
              </li>
            ))}
          </ol>
        </section>
        <p className="sr-note">
          Une information a changé ? <Link href="/feedback">Dites-le-nous</Link>.
        </p>
      </div>
    </article>
  )
}
