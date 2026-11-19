import Link from '@/platform/ui/Link'
import type { Lang } from '@/platform/i18n'
import { shortLink } from './parcours'
import { t } from './t'

type Board = {
  targets: { collection: string; id: number; name: string; slug: string; published: boolean; plan: 'gratuit' | 'pro' | 'premium'; verified: boolean }[]
  subscriptions: { id: unknown; plan: string; status: string; startsAt: string | null; endsAt: string | null; target: string }[]
  claims: { id: unknown; status: string; proofType: string; target: string; at: string }[]
  leads: { id: unknown; kind: string; name: string; message: string; at: string; status: string }[] | null
  stats: { views: number; calls: number; whatsapp: number; directions: number } | null
}

const SUB_STATUS: Record<string, string> = { en_attente: 'En attente de validation', active: 'Active', expiree: 'Expirée', annulee: 'Annulée' }
const CLAIM_STATUS: Record<string, string> = { en_attente: 'En attente de validation', acceptee: 'Acceptée', refusee: 'Refusée' }
const PLAN: Record<string, string> = { pro_mensuel: 'Pro mensuel', pro_annuel: 'Pro annuel', premium_mensuel: 'Premium mensuel', premium_annuel: 'Premium annuel' }
const LEAD: Record<string, string> = { devis: 'Devis', preinscription: 'Préinscription', rappel: 'Rappel', rdv: 'Rendez-vous' }

/**
 * Tableau de bord de l’espace pro : abonnements (dates, renouvellement), revendications, demandes reçues, statistiques 30 jours,
 * kit « Vérifié sur DALIL » (seulement si vérifié) et lien court. Lecture seule, rendu serveur.
 */
export function ProBoard({ board, lang }: { board: Board; lang: Lang }) {
  const day = (v: string | null) => (v ? new Date(v).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR') : '—')
  const active = board.subscriptions.find((s) => s.status === 'active')
  return (
    <>
      <section className="account-block" id="abonnement">
        <h2>Abonnement</h2>
        {board.subscriptions.length ? (
          board.subscriptions.slice(0, 5).map((s) => (
            <div key={String(s.id)} className={`pro-status ${s.status === 'active' ? 'pro-published' : 'pro-pending'}`}>
              <b>
                {PLAN[s.plan] ?? s.plan} · {s.target}
              </b>
              <span>
                {SUB_STATUS[s.status] ?? s.status}
                {s.status === 'active' && ` — du ${day(s.startsAt)} au ${day(s.endsAt)}, renouvellement avant le ${day(s.endsAt)}`}
              </span>
            </div>
          ))
        ) : (
          <p className="muted-line">Formule gratuite. La consultation reste gratuite pour le public.</p>
        )}
        <div className="button-row">
          <Link className="button outline" href="/espace-pro/abonnement">
            {active ? 'Changer ou renouveler' : t('Choisir ma formule', lang)}
          </Link>
          <Link className="button outline" href="/inscrire">
            {t('Inscrire mon activité', lang)}
          </Link>
        </div>
      </section>

      <section className="account-block" id="revendications">
        <h2>Revendications</h2>
        {board.claims.length ? (
          <ul className="account-facts">
            {board.claims.map((c) => (
              <li key={String(c.id)}>
                <b>{c.target}</b> — {CLAIM_STATUS[c.status] ?? c.status} ({day(c.at)})
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-line">Aucune revendication. Sur la fiche de votre établissement, suivez « Vous êtes ce professionnel ? ».</p>
        )}
      </section>

      {board.leads && (
        <section className="account-block" id="demandes">
          <h2>Demandes reçues</h2>
          {board.leads.length ? (
            <ul className="account-facts">
              {board.leads.map((l) => (
                <li key={String(l.id)}>
                  <b>{LEAD[l.kind] ?? l.kind}</b> · {l.name} ({day(l.at)}) — {l.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-line">Aucune demande pour le moment.</p>
          )}
        </section>
      )}

      {board.stats && (
        <section className="account-block" id="statistiques">
          <h2>Statistiques (30 jours)</h2>
          <ul className="account-facts">
            <li>Vues : {board.stats.views}</li>
            <li>Appels : {board.stats.calls}</li>
            <li>WhatsApp : {board.stats.whatsapp}</li>
            <li>Itinéraires : {board.stats.directions}</li>
          </ul>
        </section>
      )}

      {board.targets.some((x) => x.published) && (
        <section className="account-block" id="liens">
          <h2>Vos liens</h2>
          {board.targets
            .filter((x) => x.published && x.slug)
            .map((x) => (
              <p key={`${x.collection}:${x.id}`} className="muted-line">
                {x.name} : <a href={`/pro/${x.slug}`} dir="ltr">{shortLink(x.slug)}</a>
                {x.verified && (
                  <>
                    {' '}
                    · Kit « Vérifié sur DALIL » : <a href={`/api/kit/${x.collection}/${x.slug}?format=visuel`} download>visuel</a> · <a href={`/api/kit/${x.collection}/${x.slug}?format=qr`} download>QR code</a>
                  </>
                )}
              </p>
            ))}
        </section>
      )}
    </>
  )
}
