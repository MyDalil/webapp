'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/platform/ui/Link'
import { MicButton } from '@/platform/ui/MicButton'
import type { Topic } from '../officiel/topics'

export type BrowserItem = { slug: string; title: string; summary: string; online: boolean; onlineUrl: string | null; platform: string | null; where: string | null; audience: string[] }
type Aud = '' | 'residents' | 'diaspora' | 'etrangers'
const AUD: [Aud, string][] = [['', 'Toutes les situations'], ['residents', 'Je vis en Algérie'], ['diaspora', 'Je vis à l’étranger'], ['etrangers', 'Étranger en Algérie']]
const KEY = 'dalil-situation'
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const host = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

/** Démarches d’un thème groupées par sujet (3 visibles par sujet), filtres situation, en ligne et texte. */
type T = { key: string; title: string; sub: string; match: string; photo: string; tone: string }
export function ThemeBrowser({ items, topics, label, fallback }: { items: BrowserItem[]; topics: T[]; label: string; fallback: { photo: string; tone: string } }) {
  const [aud, setAud] = useState<Aud>('')
  const [online, setOnline] = useState(false)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Aud | null
      if (v && AUD.some(([k]) => k === v)) setAud(v)
    } catch {}
  }, [])
  const pickAud = (v: Aud) => {
    setAud(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {}
  }
  const groups = useMemo(() => {
    const w = norm(q.trim())
    const shown = items
      .filter((i) => !aud || !i.audience.length || i.audience.includes(aud))
      .filter((i) => !online || i.online)
      .filter((i) => !w || norm(`${i.title} ${i.summary}`).includes(w))
      .sort((a, b) => Number(b.online) - Number(a.online) || a.title.localeCompare(b.title, 'fr'))
    const rules = topics.map((t) => ({ ...t, re: new RegExp(t.match, 'i') }))
    const out = new Map<string, { title: string; sub: string; photo: string; tone: string; list: BrowserItem[] }>()
    for (const t of rules) out.set(t.key, { title: t.title, sub: t.sub, photo: t.photo, tone: t.tone, list: [] })
    out.set('autres', { title: rules.length ? 'Autres démarches' : 'Toutes les démarches', sub: 'Les autres démarches de ce thème.', ...fallback, list: [] })
    for (const i of shown) {
      const t = rules.find((r) => r.re.test(`${i.slug} ${i.title}`))
      out.get(t ? t.key : 'autres')!.list.push(i)
    }
    return [...out.entries()].filter(([, g]) => g.list.length)
  }, [items, topics, aud, online, q, fallback])

  return (
    <div className="tb">
      <div className="tb-bar">
        <div className="tb-seg" role="group" aria-label="Votre situation">
          {AUD.map(([k, l]) => (
            <button key={k || 'all'} type="button" aria-pressed={aud === k} onClick={() => pickAud(k)}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="tb-toggle" aria-pressed={online} onClick={() => setOnline(!online)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 5 5L20 7" />
          </svg>
          En ligne seulement
        </button>
        <label className="tb-search">
          <span className="sr-only">Chercher dans {label}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Chercher dans ${label.toLowerCase()}…`} />
          <MicButton />
        </label>
      </div>
      {!groups.length && <p className="sr-note">Aucune démarche avec ces filtres. Essayez « Toutes les situations ».</p>}
      <div className="tb-grid">
        {groups.map(([key, g]) => {
          const all = open[key]
          return (
            <article key={key} className="tb-card" style={{ ['--st' as string]: g.tone }}>
              <header>
                <span className="tb-photo" style={{ backgroundImage: `url(${g.photo})` }} aria-hidden="true" />
                <span>
                  <h2>{g.title}</h2>
                  <p>{g.sub}</p>
                </span>
              </header>
              <ul>
                {(all ? g.list : g.list.slice(0, 3)).map((i) => (
                  <li key={i.slug} className="tb-row">
                    <Link href={`/demarches/${i.slug}`} className="tb-main">
                      <span className={`tb-ico${i.online ? ' is-online' : ''}`} aria-hidden="true">
                        <svg viewBox="0 0 24 24">{i.online ? <path d="m5 12 5 5L20 7" /> : <path d="M14 3H6v18h12V7l-4-4ZM14 3v4h4M9 13h6M9 17h6" />}</svg>
                      </span>
                      <span className="tb-text">
                        <b>{i.title}</b>
                        {i.online ? <small className="is-online">En ligne</small> : i.where && i.where.length <= 48 ? <small>{i.where}</small> : null}
                      </span>
                    </Link>
                    {i.online && i.onlineUrl ? (
                      <a className="tb-cta is-online" href={i.onlineUrl} target="_blank" rel="noopener noreferrer">
                        Faire en ligne ↗
                      </a>
                    ) : (
                      <Link className="tb-cta" href={`/demarches/${i.slug}`}>
                        Voir la fiche ›
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {g.list.length > 3 && (
                <button type="button" className="tb-more" onClick={() => setOpen({ ...open, [key]: !all })} aria-expanded={Boolean(all)}>
                  {all ? 'Réduire' : 'Tout le sujet ›'}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
