'use client'

import { useRef, useState } from 'react'
import { useLang } from '@/platform/ui/lang'
import { proofHeaders } from '@/platform/security/proofClient'
import { gateFocus, requireMember } from '@/platform/ui/memberGate'
import type { LeadKind, LeadTarget } from '../offreRules'

type L = 'fr' | 'en' | 'ar'
const T: Record<string, Record<L, string>> = {
  devis: { fr: 'Demander un devis', en: 'Request a quote', ar: 'اطلب عرض سعر' },
  preinscription: { fr: 'Pré-inscrire mon enfant', en: 'Pre-register my child', ar: 'تسجيل مسبق لطفلي' },
  rappel: { fr: 'Être rappelé', en: 'Call me back', ar: 'اطلب معاودة الاتصال' },
  name: { fr: 'Nom', en: 'Name', ar: 'الاسم' },
  phone: { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' },
  email: { fr: 'Email (facultatif)', en: 'Email (optional)', ar: 'البريد الإلكتروني (اختياري)' },
  message: { fr: 'Votre demande', en: 'Your request', ar: 'طلبك' },
  consent: {
    fr: 'J’accepte que mon nom et mon téléphone soient transmis à cet établissement pour cette demande seulement.',
    en: 'I agree that my name and phone number are sent to this business for this request only.',
    ar: 'أوافق على إرسال اسمي ورقم هاتفي إلى هذا المحل لهذا الطلب فقط.',
  },
  send: { fr: 'Envoyer', en: 'Send', ar: 'إرسال' },
  sending: { fr: 'Envoi…', en: 'Sending…', ar: 'جارٍ الإرسال…' },
  done: { fr: 'Demande envoyée. L’établissement vous recontactera.', en: 'Request sent. The business will contact you.', ar: 'تم إرسال الطلب. سيتصل بك المحل.' },
  error: { fr: 'Envoi impossible : réessayez.', en: 'Could not send: please try again.', ar: 'تعذّر الإرسال: أعد المحاولة.' },
  close: { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
}

/**
 * Bouton « Demander un devis » / « Pré-inscrire mon enfant » / « Être rappelé » et son formulaire court
 * (nom, téléphone, message, accord). Envoi à /api/leads avec la preuve anti-robot. Classes de la maquette seulement.
 */
export function LeadForm({ target, kind }: { target: { collection: LeadTarget; id: string | number }; kind: LeadKind }) {
  const lang = useLang() as L
  const ref = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (f.get('website')) return
    if (!(await requireMember())) return
    setState('sending')
    setMsg('')
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: await proofHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ collection: target.collection, id: String(target.id), name: f.get('name'), phone: f.get('phone'), email: f.get('email'), message: f.get('message'), consent: f.get('consent') === 'on' }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setState('idle')
        setMsg(lang === 'fr' && j.error ? j.error : T.error[lang])
        return
      }
      setState('done')
      setMsg(T.done[lang])
    } catch {
      setState('idle')
      setMsg(T.error[lang])
    }
  }

  return (
    <>
      <button className="button outline" type="button" onClick={() => ref.current?.showModal()}>
        {T[kind][lang]}
      </button>
      <dialog
        className="login-dialog"
        ref={ref}
        aria-labelledby={`lead-${target.collection}-${target.id}`}
        onClick={(e) => {
          const r = ref.current!.getBoundingClientRect()
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ref.current?.close()
        }}
      >
        <button className="dialog-close" type="button" aria-label={T.close[lang]} onClick={() => ref.current?.close()}>
          ×
        </button>
        <h2 id={`lead-${target.collection}-${target.id}`}>{T[kind][lang]}</h2>
        {state === 'done' ? (
          <p className="form-status" aria-live="polite">
            {msg}
          </p>
        ) : (
          <form className="product-form" onSubmit={submit} onFocusCapture={gateFocus}>
            <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="form-grid">
              <label>
                <span>{T.name[lang]} *</span>
                <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
              </label>
              <label>
                <span>{T.phone[lang]} *</span>
                <input name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" dir="ltr" />
              </label>
            </div>
            <label>
              <span>{T.email[lang]}</span>
              <input name="email" type="email" maxLength={120} autoComplete="email" dir="ltr" />
            </label>
            <label>
              <span>{T.message[lang]} *</span>
              <textarea name="message" required minLength={5} maxLength={1000} rows={4} />
            </label>
            <label className="check">
              <input type="checkbox" name="consent" required /> <span>{T.consent[lang]}</span>
            </label>
            <button className="button primary wide" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? T.sending[lang] : T.send[lang]}
            </button>
            <p className="form-status" aria-live="polite">
              {msg}
            </p>
          </form>
        )}
      </dialog>
    </>
  )
}
