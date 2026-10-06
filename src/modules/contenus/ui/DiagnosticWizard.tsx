'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { GUIDES } from '@/platform/referentiel/catalog'

const QUESTIONS: { key: string; title: string; options: [string, string][] }[] = [
  { key: 'climate', title: 'Quel environnement préférez-vous ?', options: [['coast', 'Proche de la mer'], ['mild', 'Tempéré et verdoyant'], ['dry', 'Sec et ensoleillé']] },
  { key: 'rhythm', title: 'Quel rythme de vie recherchez-vous ?', options: [['urban', 'Très urbain'], ['balanced', 'Équilibré'], ['calm', 'Calme']] },
  { key: 'priority', title: 'Quelle est votre priorité ?', options: [['work', 'Travail ou études'], ['family', 'Famille et éducation'], ['community', 'Liens et vie locale']] },
  { key: 'budget', title: 'Comment envisagez-vous votre budget ?', options: [['tight', 'À optimiser'], ['balanced', 'Intermédiaire'], ['comfort', 'Confortable']] },
]

const pick = (a: Record<string, string>) => ['choisir-sa-ville', a.priority === 'family' ? 'ecole-et-famille' : a.priority === 'work' ? 'travail-et-entreprise' : 'decouvrir-algerie', 'budget-et-banque']

export function DiagnosticWizard() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const cards = pick(answers).map((s) => GUIDES.find((g) => g.slug === s)!).filter(Boolean)

  async function save() {
    setBusy(true)
    try {
      const r = await fetch('/api/diagnostics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers }) })
      const j = await r.json()
      setMsg(r.ok ? 'Votre parcours est enregistré dans votre espace.' : (j.error ?? 'Enregistrement indisponible.'))
    } catch {
      setMsg('Connexion interrompue. Vos réponses restent dans cette page.')
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setDone(true)
  }

  if (done)
    return (
      <section className="diagnostic-results">
        <span className="section-label">VOS PROCHAINS REPÈRES</span>
        <h2>Un point de départ pour votre projet.</h2>
        <p>Vos critères servent à préparer vos comparaisons. Une ville se choisit avec des observations concrètes et des informations à jour.</p>
        <div className="diagnostic-cards">
          {cards.map((g) => (
            <article key={g.slug}>
              <h3>{g.title}</h3>
              <p>{g.summary}</p>
              <Link href={`/guides/${g.slug}`}>Lire le guide →</Link>
            </article>
          ))}
        </div>
        <div className="orientation-actions">
          <button className="outline-button" onClick={() => setDone(false)}>
            Modifier mes réponses
          </button>
          <button className="green-button" disabled={busy} onClick={() => void save()}>
            {busy ? 'Enregistrement…' : 'Enregistrer mon parcours'}
          </button>
          <Link href="/boutique?offer=member">L’accompagnement membre</Link>
        </div>
        <p role="status">{msg}</p>
      </section>
    )

  return (
    <form className="diagnostic-form" onSubmit={submit}>
      <div className="question-grid">
        {QUESTIONS.map((q, i) => (
          <label key={q.key}>
            <b>0{i + 1}</b>
            <span>{q.title}</span>
            <select required value={answers[q.key] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}>
              <option value="" disabled>
                Choisir une réponse
              </option>
              {q.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button className="green-button diagnostic-submit">Trouver mes premiers repères →</button>
    </form>
  )
}
