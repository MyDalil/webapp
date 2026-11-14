'use client'
import { useTheme, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type AnyIcon, Icon } from './icons'

type Page = { label: string; group: string; href: string; icon: AnyIcon }
type Hit = { label: string; group: string; href: string; icon: AnyIcon }
type Labels = { search: string; placeholder: string; pages: string; results: string; none: string; theme: string; lang: string; close: string }

/** Champ de titre et libellé de chaque collection cherchée par la palette. */
const SEARCH: Record<string, { field: string; group: string; icon: AnyIcon }> = {
  places: { field: 'name', group: 'Fiches', icon: 'file' },
  providers: { field: 'displayName', group: 'Prestataires', icon: 'tool' },
  classifieds: { field: 'title', group: 'Annonces', icon: 'tag' },
  members: { field: 'email', group: 'Membres', icon: 'users' },
  procedures: { field: 'title', group: 'Démarches', icon: 'flag' },
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function CommandBar({ pages, searchable, labels }: { pages: Page[]; searchable: readonly string[]; labels: Labels }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { i18n, switchLanguage } = useTranslation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setQ(''); setSel(0); setOpen((o) => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Recherche dans les données, avec les droits de la session (API REST de Payload).
  useEffect(() => {
    if (!open || q.trim().length < 2) return
    const ctl = new AbortController()
    const id = setTimeout(async () => {
      const lists = await Promise.all(searchable.map(async (c) => {
        const s = SEARCH[c]
        if (!s) return []
        try {
          const r = await fetch(`/api/${c}?limit=4&depth=0&select[${s.field}]=true&where[${s.field}][like]=${encodeURIComponent(q.trim())}`, { credentials: 'include', signal: ctl.signal })
          if (!r.ok) return []
          const j = (await r.json()) as { docs: Array<Record<string, unknown>> }
          return j.docs.map((d) => ({ label: String(d[s.field] ?? d.id), group: s.group, href: `/admin/collections/${c}/${d.id}`, icon: s.icon }))
        } catch { return [] }
      }))
      setHits(lists.flat())
    }, 220)
    return () => { clearTimeout(id); ctl.abort() }
  }, [q, open, searchable])

  const pageHits = useMemo(() => {
    const n = norm(q.trim())
    return (n ? pages.filter((p) => norm(p.label).includes(n) || norm(p.group).includes(n)) : pages).slice(0, n ? 8 : 12)
  }, [q, pages])
  const shown = q.trim().length < 2 ? [] : hits
  const all = [...pageHits, ...shown]

  const go = useCallback((href: string) => { setOpen(false); router.push(href) }, [router])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, all.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && all[sel]) go(all[sel].href)
  }

  const lang = i18n.language
  return (
    <div className="dl-bar dl">
      <button type="button" className="dl-cmd" onClick={() => { setQ(''); setSel(0); setOpen(true) }} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
        <Icon name="search" /><span className="dl-cmd-t">{labels.search}</span><span className="dl-kbd" aria-hidden="true">⌘K</span>
      </button>
      <div className="dl-seg" role="group" aria-label={labels.lang}>
        {(['fr', 'ar', 'en'] as const).map((l) => (
          <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => switchLanguage?.(l)}>{l === 'ar' ? 'ع' : l.toUpperCase()}</button>
        ))}
      </div>
      <button type="button" className="dl-ib" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={labels.theme}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      {open && (
        <div className="dl-pal-bg" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="dl-pal" role="dialog" aria-modal="true" aria-label={labels.search} onKeyDown={onKeyDown}>
            <div className="dl-pal__in">
              <Icon name="search" />
              <input ref={input} autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} placeholder={labels.placeholder} aria-label={labels.placeholder} role="combobox" aria-expanded="true" aria-controls="dl-pal-list" />
              <button type="button" className="dl-ib" onClick={() => setOpen(false)} aria-label={labels.close}><Icon name="x" /></button>
            </div>
            <div className="dl-pal__list" id="dl-pal-list" role="listbox">
              {pageHits.length > 0 && <div className="dl-pal__sec">{labels.pages}</div>}
              {pageHits.map((p, i) => (
                <button key={p.href} type="button" role="option" aria-selected={sel === i} className="dl-pal__it" onMouseEnter={() => setSel(i)} onClick={() => go(p.href)}>
                  <Icon name={p.icon} /><span>{p.label}</span><small>{p.group}</small>
                </button>
              ))}
              {shown.length > 0 && <div className="dl-pal__sec">{labels.results}</div>}
              {shown.map((h, j) => {
                const i = pageHits.length + j
                return (
                  <button key={h.href} type="button" role="option" aria-selected={sel === i} className="dl-pal__it" onMouseEnter={() => setSel(i)} onClick={() => go(h.href)}>
                    <Icon name={h.icon} /><span>{h.label}</span><small>{h.group}</small>
                  </button>
                )
              })}
              {all.length === 0 && <div className="dl-pal__empty">{labels.none}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
