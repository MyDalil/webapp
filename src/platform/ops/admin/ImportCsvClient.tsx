'use client'
import { useState, type DragEvent } from 'react'

import { csvDataRows, hasMore, maxCalls, mergeReports, progress, type Report } from './batch'

const cell = { padding: '6px 10px', borderBottom: '1px solid var(--theme-elevation-100)', textAlign: 'left' as const, verticalAlign: 'top' as const }

function Table({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return null
  return (
    <section style={{ marginTop: 'calc(var(--base) * 1.5)' }}>
      <h3>{title} ({rows.length})</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{head.map((h) => <th key={h} style={{ ...cell, color: 'var(--theme-elevation-500)', fontWeight: 500 }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={cell}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

export function ImportCsvClient() {
  const [csv, setCsv] = useState('')
  const [file, setFile] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const [pct, setPct] = useState<number | null>(null)

  const load = async (f?: File | null) => {
    if (!f) return
    setFile(f.name)
    setReport(null)
    setError('')
    setCsv(await f.text())
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void load(e.dataTransfer.files?.[0])
  }
  /** Enchaîne les lots de 150 lignes : renvoie `suite` à l’API tant qu’elle en donne une, cumule les rapports. */
  const run = async (confirmer: boolean) => {
    if (confirmer && !window.confirm(`Créer ${report?.aCreer.length ?? 0} fiche(s) en brouillon ? Rien ne sera publié.`)) return
    setBusy(true)
    setError('')
    setReport(null)
    setPct(0)
    const total = csvDataRows(csv)
    let acc: Report | null = null
    let suite: unknown
    try {
      for (let call = 0; call < maxCalls(total); call++) {
        const res = await fetch('/api/ops/import-csv', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv, wilaya: wilaya || undefined, confirmer, ...(suite !== undefined ? { depuis: suite } : {}) }) })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`)
        acc = mergeReports(acc, body as Report)
        suite = (body as Report).suite
        setReport(acc)
        setPct(progress(acc.lignes, total, suite))
        if (!hasMore(suite)) break
      }
      setPct(100)
    } catch (e) {
      const done = acc ? ` ${acc.lignes} ligne(s) déjà traitée(s)${confirmer ? ' : les fiches créées restent en brouillon' : ''}.` : ''
      setError(`${(e as Error).message}.${done}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, minWidth: 0 }}>
      <p style={{ color: 'var(--theme-elevation-600)' }}>
        Déposez un fichier CSV (séparateur « ; » ou « , », UTF-8). Colonnes : nom, secteur, catégorie, wilaya, ville, adresse, latitude, longitude, téléphone, email, site, présentation, source. La simulation n’écrit rien ; la confirmation crée les fiches en brouillon, jamais publiées.
      </p>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        style={{ display: 'block', marginTop: 'var(--base)', padding: 'calc(var(--base) * 2)', border: `1px dashed ${over ? 'var(--theme-success-500)' : 'var(--theme-elevation-250)'}`, borderRadius: 'var(--style-radius-m)', textAlign: 'center', cursor: 'pointer', background: 'var(--theme-elevation-50)', overflowWrap: 'anywhere' }}
      >
        <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => void load(e.target.files?.[0])} />
        {file ? <strong>{file}</strong> : 'Glissez le fichier ici ou cliquez pour le choisir'}
      </label>
      <div style={{ display: 'flex', gap: 'var(--base)', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--base)' }}>
        <div className="field-type text" style={{ flex: '1 1 220px', minWidth: 0, maxWidth: 320 }}>
          <label className="field-label" htmlFor="ops-wilaya">Wilaya par défaut (facultatif)</label>
          <input id="ops-wilaya" value={wilaya} onChange={(e) => setWilaya(e.target.value)} placeholder="Ex. Alger ou 16" />
        </div>
        <button type="button" className="btn btn--style-secondary btn--size-medium" disabled={!csv || busy} onClick={() => void run(false)}>{busy ? 'En cours…' : 'Simuler l’import'}</button>
        {!busy && report?.mode === 'simulation' && report.aCreer.length > 0 ? (
          <button type="button" className="btn btn--style-primary btn--size-medium" disabled={busy} onClick={() => void run(true)}>Confirmer en brouillon ({report.aCreer.length})</button>
        ) : null}
      </div>
      {pct !== null && (busy || pct < 100) ? (
        <div style={{ marginTop: 'var(--base)' }}>
          <div role="progressbar" aria-label="Avancement de l’import" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} style={{ height: 8, borderRadius: 999, background: 'var(--theme-elevation-100)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--theme-success-500)', transition: 'width .3s ease' }} />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--theme-elevation-600)' }}>{pct} % — {report?.lignes ?? 0} ligne(s) traitée(s)</p>
        </div>
      ) : null}
      {error ? <p role="alert" style={{ color: 'var(--theme-error-500)', marginTop: 'var(--base)' }}>{error}</p> : null}
      {report ? (
        <div aria-live="polite" style={{ marginTop: 'calc(var(--base) * 1.5)' }}>
          <p>
            <strong>{busy ? 'En cours' : report.mode === 'simulation' ? 'Simulation' : 'Import fait'}</strong> — {report.lignes} ligne(s) : {report.aCreer.length} à créer, {report.doublons.length} doublon(s), {report.erreurs.length} erreur(s).
            {report.crees ? ` ${report.crees.length} fiche(s) créée(s) en brouillon.` : ''}
          </p>
          {report.colonnesIgnorees.length ? <p style={{ color: 'var(--theme-elevation-600)' }}>Colonnes ignorées : {report.colonnesIgnorees.join(', ')}</p> : null}
          <Table title="Créées en brouillon" head={['Ligne', 'Nom', 'Fiche']} rows={(report.crees ?? []).map((c) => [c.line, c.name, `#${c.id}`])} />
          <Table title="Échecs à la création" head={['Ligne', 'Erreur']} rows={(report.echecs ?? []).map((c) => [c.line, c.erreur])} />
          {report.mode === 'simulation' ? <Table title="À créer" head={['Ligne', 'Nom', 'Ville', 'Catégorie']} rows={report.aCreer.map((r) => [r.line, r.name, r.city, r.category])} /> : null}
          <Table title="Doublons probables (non importés)" head={['Ligne', 'Nom', 'Motif', 'Déjà présent']} rows={report.doublons.map((d) => [d.line, d.name, d.reason + (d.distanceM != null ? ` (${d.distanceM} m)` : ''), d.existing.line ? `ligne ${d.existing.line} du fichier` : `${d.existing.name} (#${d.existing.id})`])} />
          <Table title="Erreurs" head={['Ligne', 'Problèmes']} rows={report.erreurs.map((e) => [e.line, e.errors.join(' ; ')])} />
        </div>
      ) : null}
    </div>
  )
}
