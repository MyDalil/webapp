'use client'

import { useState } from 'react'
import { RequestForm } from './RequestForm'

type Props = {
  pack: string
  perPerson: boolean
  priceEur: number | null
  priceLabel: string
  waitlist: boolean
  paymentEnabled: boolean
  /** Offre « Ouverte » dans /admin : sinon le bouton de réservation affiche « À venir ». */
  open: boolean
}

const eur = (n: number) => `${n.toLocaleString('fr-FR')} €`

/** Réservation d’un pack : nombre de personnes, tarification, mode de paiement (fermé tant qu’aucun compte marchand), coordonnées. */
export function Booking({ pack, perPerson, priceEur, priceLabel, waitlist, paymentEnabled, open }: Props) {
  const [persons, setPersons] = useState(1)
  const total = priceEur ? priceEur * (perPerson ? persons : 1) : null
  return (
    <div className="ac-booking">
      {perPerson && (
        <section className="ac-card ac-stepper" aria-label="Nombre de personnes">
          <b>Nombre de personnes</b>
          <div>
            <button type="button" aria-label="Une personne de moins" onClick={() => setPersons((n) => Math.max(1, n - 1))} disabled={persons <= 1}>
              −
            </button>
            <output aria-live="polite">{persons}</output>
            <button type="button" aria-label="Une personne de plus" onClick={() => setPersons((n) => Math.min(20, n + 1))} disabled={persons >= 20}>
              +
            </button>
          </div>
        </section>
      )}
      <section className="ac-card ac-pricing" aria-label="Tarification">
        <b>Tarification</b>
        <p>
          <span>
            Pack{perPerson && priceEur ? ` (${eur(priceEur)} × ${persons} personne${persons > 1 ? 's' : ''})` : ''}
          </span>
          <span>{total ? eur(total) : priceLabel}</span>
        </p>
        <p className="is-total">
          <span>Total</span>
          <span>{total ? eur(total) : 'Annoncé au lancement'}</span>
        </p>
      </section>
      <section className="ac-card ac-payment" aria-label="Mode de paiement">
        <b>Mode de paiement</b>
        {['Carte bancaire', 'CIB / Edahabia', 'BaridiMob'].map((m) => (
          <p key={m} className="ac-pay-row" aria-disabled={!paymentEnabled}>
            <span>{m}</span>
            <small>{paymentEnabled ? '' : 'Bientôt'}</small>
          </p>
        ))}
        {!paymentEnabled && <small className="ac-pay-note">Le paiement en ligne n’est pas encore ouvert : rien à payer aujourd’hui.</small>}
      </section>
      {open ? (
        <section className="ac-card" aria-label="Vos coordonnées">
          <b>Vos coordonnées</b>
          <RequestForm pack={pack} waitlist={waitlist} persons={persons} />
        </section>
      ) : (
        <span className="sr-pill is-soon ac-book" role="button" aria-disabled="true">
          Réserver · À venir
        </span>
      )}
    </div>
  )
}
