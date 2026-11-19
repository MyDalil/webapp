'use client'

import { useEffect } from 'react'
import { ACTION_LABELS, contactActions, shareMessage, whatsappShareUrl } from '@/platform/seo/share'
import { sendMetric, sendViewOnce, type BeaconTarget } from '@/platform/metrics/beacon'
import { useLang } from '@/platform/ui/lang'

/**
 * Barre d’actions commune des fiches (lieu, praticien, prestataire, annonce).
 * [Partager] comme validé, puis [Appeler] [WhatsApp] [Itinéraire] seulement si la fiche porte le champ.
 * Partage : feuille native du téléphone, sinon WhatsApp avec un message pré-rempli.
 * Libellés et message dans la langue de la page (FR/EN/AR) ; le nom de la fiche n’est jamais traduit.
 * Mesure (`target`, fiches adresse, praticien, prestataire) : une vue par session du navigateur, clics Appeler, WhatsApp,
 * Itinéraire (y compris le bouton Itinéraire propre à la page, dans `.pl-actions`) et Partager ; compteurs agrégés, sans cookie.
 */
export function PlaceActions({
  name,
  phone,
  whatsapp,
  directions,
  target,
}: {
  name: string
  /** Fiche mesurée (collection et identifiant). */
  target?: BeaconTarget | null
  phone?: string | null
  whatsapp?: string | null
  /** À passer seulement si la page n’affiche pas déjà son bouton Itinéraire. */
  directions?: string | null
}) {
  const lang = useLang()
  const key = target ? `${target.collection}:${target.id}` : ''
  useEffect(() => {
    if (!target) return
    sendViewOnce(target)
    // Bouton Itinéraire affiché par la page elle-même (fiche adresse) : compté au clic, sans le modifier.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('.pl-actions a[href]') as HTMLAnchorElement | null
      if (a && !a.dataset.metric && /maps|geo:|itin/i.test(a.href)) sendMetric(target, 'directions')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  async function share() {
    sendMetric(target, 'share')
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: `${name} · DALIL`, text: shareMessage(name, url, lang), url })
      else window.open(whatsappShareUrl(name, url, lang), '_blank', 'noopener')
    } catch {
      /* partage annulé */
    }
  }
  return (
    <>
      <button className="button primary" type="button" onClick={share}>
        {ACTION_LABELS.share[lang]}
      </button>
      {contactActions({ phone, whatsapp, directions }, lang).map((a) => (
        <a key={a.kind} className="button outline" href={a.href} data-metric={a.kind} onClick={() => sendMetric(target, a.kind as 'call' | 'whatsapp' | 'directions')} {...(a.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {a.label}
        </a>
      ))}
    </>
  )
}
