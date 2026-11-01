'use client'

import { useEffect, useRef, useState } from 'react'
import { preferredLang, startDictation, type Dictation } from './speech'
import { toast } from '../shell/toast'

/** Écrit dans un champ React (contrôlé ou non) : valeur native + événement « input », comme une frappe. */
function write(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Bouton micro pour n’importe quel champ de recherche : placé dans le même parent que le champ.
 * Un clic démarre la dictée, un second clic (ou un appui sur le champ) l’arrête tout de suite.
 */
export function MicButton({ label = 'Recherche vocale', stopLabel = 'Arrêter la dictée' }: { label?: string; stopLabel?: string }) {
  const btn = useRef<HTMLButtonElement>(null)
  const dictation = useRef<Dictation | null>(null)
  const [on, setOn] = useState(false)
  useEffect(() => () => dictation.current?.stop(), [])

  const field = () => btn.current?.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type=hidden]), textarea') ?? null

  function stop() {
    if (!dictation.current) return
    setOn(false)
    dictation.current.stop()
  }

  // Appui sur le champ pendant la dictée : arrêt, la personne reprend la main au clavier.
  useEffect(() => {
    const el = field()
    if (!el || !on) return
    const onDown = () => stop()
    el.addEventListener('pointerdown', onDown)
    return () => el.removeEventListener('pointerdown', onDown)
  }, [on])

  function toggle() {
    if (on) return stop()
    const el = field()
    if (!el) return
    const base = el.value.trim()
    dictation.current = startDictation({
      lang: preferredLang(),
      onLive: (t) => write(el, [base, t].filter(Boolean).join(' ')),
      onError: (m) => toast(m),
      onDone: (t) => {
        setOn(false)
        dictation.current = null
        write(el, [base, t].filter(Boolean).join(' '))
        el.focus()
      },
    })
    if (dictation.current) setOn(true)
  }

  return (
    <button ref={btn} type="button" className={`field-mic${on ? ' recording' : ''}`} aria-pressed={on} aria-label={on ? stopLabel : label} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
      </svg>
    </button>
  )
}
