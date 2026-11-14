'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

/** Plafond du corps de requête Vercel : au-delà, la photo est réduite dans le navigateur avant l’envoi. */
const MAX_BYTES = 4 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

type Item = {
  key: string
  file: File
  url: string
  alt: string
  altAr: string
  altEn: string
  credit: string
  hash?: string
  dup?: { id: number; alt: string } | null
  progress: number
  state: 'ready' | 'checking' | 'sending' | 'done' | 'error'
  error?: string
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const altFromName = (name: string) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)

/** Réduit une photo trop lourde (2560 px au plus, JPEG 0,9). Les autres partent telles quelles. */
async function fit(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', 0.9))
  return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, '.jpg'), { type: 'image/jpeg' })
}

export function MediaDrop({ labels }: { labels: Record<string, string> }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [over, setOver] = useState(false)
  const patch = (key: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)))

  const add = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((f) => ACCEPT.includes(f.type))
    const fresh: Item[] = list.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, file: f, url: URL.createObjectURL(f), alt: altFromName(f.name), altAr: '', altEn: '', credit: '', progress: 0, state: 'checking' }))
    setItems((xs) => [...xs, ...fresh])
    for (const it of fresh) {
      try {
        const file = await fit(it.file)
        const hash = hex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))
        const r = await fetch(`/api/media?where[hash][equals]=${hash}&limit=1&depth=0`, { credentials: 'include' })
        const j = (await r.json().catch(() => ({ docs: [] }))) as { docs?: Array<{ id: number; alt: string }> }
        patch(it.key, { file, hash, dup: j.docs?.[0] ?? null, state: 'ready' })
      } catch (e) {
        patch(it.key, { state: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }
  }, [])

  const send = (it: Item) => new Promise<void>((resolve) => {
    if (!it.alt.trim()) { patch(it.key, { state: 'error', error: labels.altRequired }); return resolve() }
    const fd = new FormData()
    fd.append('file', it.file)
    fd.append('_payload', JSON.stringify({ alt: it.alt.trim(), altAr: it.altAr.trim() || undefined, altEn: it.altEn.trim() || undefined, credit: it.credit.trim() || undefined }))
    const x = new XMLHttpRequest()
    x.open('POST', '/api/media')
    x.withCredentials = true
    x.upload.onprogress = (e) => e.lengthComputable && patch(it.key, { progress: Math.round((e.loaded / e.total) * 100) })
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) patch(it.key, { state: 'done', progress: 100 })
      else {
        let msg = `Erreur ${x.status}`
        try { msg = (JSON.parse(x.responseText) as { errors?: Array<{ message?: string }> }).errors?.[0]?.message ?? msg } catch {}
        patch(it.key, { state: 'error', error: msg })
      }
      resolve()
    }
    x.onerror = () => { patch(it.key, { state: 'error', error: labels.network }); resolve() }
    patch(it.key, { state: 'sending', error: undefined })
    x.send(fd)
  })

  const sendAll = async () => {
    for (const it of items.filter((x) => x.state === 'ready' || x.state === 'error')) await send(it)
    router.refresh()
  }
  const ready = items.filter((x) => x.state === 'ready' || x.state === 'error').length

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        className={over ? 'dl-drop on' : 'dl-drop'}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files) }}
      >
        <b>{labels.drop}</b>
        <span className="dl-mu" style={{ fontSize: 12.5 }}>{labels.dropHint}</span>
        <input ref={input} type="file" accept={ACCEPT.join(',')} multiple hidden data-testid="media-input" onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = '' }} />
      </div>
      {items.length ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }} aria-label={labels.queue}>
          {items.map((it) => (
            <li key={it.key} className="dl-up">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
              <img src={it.url} alt="" width={96} height={72} />
              <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <input className="dl-inp" value={it.alt} onChange={(e) => patch(it.key, { alt: e.target.value })} placeholder={labels.alt} aria-label={`${labels.alt} — ${it.file.name}`} maxLength={160} disabled={it.state === 'sending' || it.state === 'done'} />
                <div className="dl-row dl-wr" style={{ gap: 6 }}>
                  <input className="dl-inp" dir="rtl" lang="ar" value={it.altAr} onChange={(e) => patch(it.key, { altAr: e.target.value })} placeholder={labels.altAr} aria-label={labels.altAr} style={{ flex: '1 1 160px' }} disabled={it.state === 'done'} />
                  <input className="dl-inp" lang="en" value={it.altEn} onChange={(e) => patch(it.key, { altEn: e.target.value })} placeholder={labels.altEn} aria-label={labels.altEn} style={{ flex: '1 1 160px' }} disabled={it.state === 'done'} />
                  <input className="dl-inp" value={it.credit} onChange={(e) => patch(it.key, { credit: e.target.value })} placeholder={labels.credit} aria-label={labels.credit} style={{ flex: '1 1 140px' }} disabled={it.state === 'done'} />
                </div>
                {it.dup ? <span role="status" className="dl-pill wa" style={{ whiteSpace: 'normal' }}>{labels.dup} <a href={`/admin/cockpit/medias?id=${it.dup.id}`}>#{it.dup.id} {it.dup.alt}</a></span> : null}
                {it.state === 'sending' ? <div className="dl-meter" role="progressbar" aria-valuenow={it.progress} aria-valuemin={0} aria-valuemax={100} aria-label={it.file.name}><span style={{ width: `${it.progress}%` }} /></div> : null}
                {it.state === 'done' ? <span className="dl-pill ok" role="status">{labels.sent}</span> : null}
                {it.error ? <span role="alert" style={{ color: 'var(--dl-da)', fontSize: 12 }}>{it.error}</span> : null}
              </div>
              <button type="button" className="dl-btn" aria-label={`${labels.remove} — ${it.file.name}`} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} disabled={it.state === 'sending'}>✕</button>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length ? (
        <div className="dl-row dl-wr" style={{ gap: 8 }}>
          <button type="button" className="dl-btn pri" onClick={sendAll} disabled={!ready || items.some((x) => x.state === 'checking' || x.state === 'sending')}>{labels.send} ({ready})</button>
          <button type="button" className="dl-btn" onClick={() => setItems((xs) => xs.filter((x) => x.state !== 'done'))}>{labels.clear}</button>
        </div>
      ) : null}
    </div>
  )
}

/** Point focal : un clic sur l’image le place ; les formats sont recadrés autour (Payload, `uploadEdits`). */
export function FocalPicker({ id, src, x, y, label, saved }: { id: number; src: string; x: number; y: number; label: string; saved: string }) {
  const router = useRouter()
  const [pt, setPt] = useState({ x, y })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const place = async (nx: number, ny: number) => {
    setPt({ x: nx, y: ny }); setState('saving')
    const r = await fetch(`/api/media/${id}?uploadEdits[focalPoint][x]=${nx}&uploadEdits[focalPoint][y]=${ny}`, { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' })
    setState(r.ok ? 'saved' : 'error')
    if (r.ok) router.refresh()
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <button type="button" className="dl-focal" aria-label={label} onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect()
        void place(Math.round(((e.clientX - b.left) / b.width) * 100), Math.round(((e.clientY - b.top) / b.height) * 100))
      }} onKeyDown={(e) => {
        const d: Record<string, [number, number]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }
        const m = d[e.key]
        if (m) { e.preventDefault(); void place(Math.max(0, Math.min(100, pt.x + m[0])), Math.max(0, Math.min(100, pt.y + m[1]))) }
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu admin, taille d’origine */}
        <img src={src} alt="" />
        <span className="dl-focal-pt" style={{ left: `${pt.x}%`, top: `${pt.y}%` }} aria-hidden />
      </button>
      <span className="dl-mu" style={{ fontSize: 12 }} role="status">{pt.x} % · {pt.y} %{state === 'saving' ? ' · …' : state === 'saved' ? ` · ${saved}` : state === 'error' ? ' · ✕' : ''}</span>
    </div>
  )
}
