'use client'

import { useRef, useState } from 'react'
import { useLang } from '@/platform/ui/lang'

type L = 'fr' | 'en' | 'ar'
const T: Record<string, Record<L, string>> = {
  open: { fr: 'Poser une question', en: 'Ask a question', ar: 'اطرح سؤالًا' },
  hint: {
    fr: 'Réponse tirée uniquement des informations publiées sur cette fiche. Ne partagez pas de donnée personnelle.',
    en: 'Answers come only from the information published on this page. Do not share personal data.',
    ar: 'الإجابة مأخوذة فقط من المعلومات المنشورة في هذه الصفحة. لا تشارك بيانات شخصية.',
  },
  label: { fr: 'Votre question', en: 'Your question', ar: 'سؤالك' },
  ask: { fr: 'Demander', en: 'Ask', ar: 'اسأل' },
  wait: { fr: 'Recherche…', en: 'Looking…', ar: 'جارٍ البحث…' },
  error: { fr: 'Réponse indisponible : réessayez plus tard.', en: 'No answer available: try again later.', ar: 'الإجابة غير متاحة: أعد المحاولة لاحقًا.' },
  close: { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
}

/** Assistant d’une fiche Premium : bouton « Poser une question », une question (300 caractères), une réponse. Aucune mémoire. */
export function AskBox({ target }: { target: { collection: 'places' | 'practitioners' | 'providers'; id: string | number } }) {
  const lang = useLang() as L
  const ref = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    if (q.length < 3) return
    setBusy(true)
    setAnswer('')
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ c: target.collection, i: String(target.id), q, lang }) })
      const j = (await r.json().catch(() => ({}))) as { answer?: string; error?: string }
      setAnswer(j.answer ?? (lang === 'fr' && j.error ? j.error : T.error[lang]))
    } catch {
      setAnswer(T.error[lang])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="button outline" type="button" onClick={() => ref.current?.showModal()}>
        {T.open[lang]}
      </button>
      <dialog
        className="login-dialog"
        ref={ref}
        aria-label={T.open[lang]}
        onClick={(e) => {
          const r = ref.current!.getBoundingClientRect()
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ref.current?.close()
        }}
      >
        <button className="dialog-close" type="button" aria-label={T.close[lang]} onClick={() => ref.current?.close()}>
          ×
        </button>
        <h2>{T.open[lang]}</h2>
        <p>{T.hint[lang]}</p>
        <form className="product-form" onSubmit={submit}>
          <label>
            <span>{T.label[lang]}</span>
            <textarea name="q" required minLength={3} maxLength={300} rows={3} />
          </label>
          <button className="button primary wide" type="submit" disabled={busy}>
            {busy ? T.wait[lang] : T.ask[lang]}
          </button>
          <p className="form-status" aria-live="polite">
            {answer}
          </p>
        </form>
      </dialog>
    </>
  )
}
