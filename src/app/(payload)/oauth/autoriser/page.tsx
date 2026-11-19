import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { MinimalTemplate } from '@payloadcms/next/templates'
import { payload } from '@/platform/http'
import { checkAuthorize, consentHash, issueConsent, staffPrincipal, type UserRecord } from '@/platform/oauth/core'
import { oauthConfig } from '@/platform/oauth/server'

export const metadata: Metadata = { title: 'Autoriser une application — DALIL', robots: { index: false, follow: false } }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const ROLE = { patron: 'patron', admin: 'administrateur', editor: 'rédacteur' } as const

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MinimalTemplate>
      <h1 style={{ marginBottom: 'var(--base)' }}>{title}</h1>
      {children}
    </MinimalTemplate>
  )
}

/**
 * Consentement OAuth : relier ChatGPT ou claude.ai au serveur MCP admin de DALIL.
 * Réservé aux comptes équipe connectés à /admin (patron, admin, editor) ; style de l’admin Payload.
 */
export default async function AuthorizePage({ searchParams }: Props) {
  const sp = await searchParams
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') params[k] = v
  const cfg = oauthConfig()
  if (!cfg) return <Box title="Connexion indisponible"><p>OAuth n’est pas configuré sur ce serveur.</p></Box>
  const check = checkAuthorize(cfg, params)
  if (!check.ok && 'page' in check) return <Box title="Demande refusée"><p>{check.page}</p></Box>
  if (!check.ok) redirect(check.redirect)

  const p = await payload()
  const { user } = await p.auth({ headers: await headers() })
  if (!user || (user as { collection?: string }).collection !== 'users')
    redirect(`/admin/login?redirect=${encodeURIComponent(`/oauth/autoriser?${new URLSearchParams(params).toString()}`)}`)
  const me = staffPrincipal(user as unknown as UserRecord)
  if (!me)
    return (
      <Box title="Accès refusé">
        <p>Votre compte n’a pas le droit de relier une application à l’administration de DALIL (rôles patron, administrateur ou rédacteur).</p>
      </Box>
    )

  const consent = issueConsent(cfg, me.userId, consentHash(check))
  const target = new URL(check.redirectUri)
  return (
    <Box title="Autoriser l’accès à DALIL">
      <p>
        <strong>{check.client.name}</strong> (nom déclaré par l’application) demande à agir sur l’administration de DALIL avec votre compte.
      </p>
      <ul style={{ margin: 'var(--base) 0', paddingInlineStart: 'calc(var(--base) * 1.2)' }}>
        <li>Compte connecté : {me.name} ({String((user as { email?: string }).email ?? '')}) — rôle {ROLE[me.role]}.</li>
        <li>Droits : l’IA connectée peut lire et préparer des brouillons ; la publication se fait seulement par un clic dans /admin, Telegram ou WhatsApp.</li>
        <li style={{ overflowWrap: 'anywhere' }}>Retour vers : {target.host}</li>
        <li>Durée : 1 heure, renouvelée tant que l’application est utilisée (30 jours au plus sans usage).</li>
      </ul>
      <p>N’autorisez que si vous venez vous-même de lancer cette connexion depuis ChatGPT ou claude.ai.</p>
      <form method="post" action="/api/oauth/autoriser" style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(var(--base) / 2)', marginTop: 'var(--base)' }}>
        <input type="hidden" name="client_id" value={check.clientId} />
        <input type="hidden" name="redirect_uri" value={check.redirectUri} />
        <input type="hidden" name="code_challenge" value={check.challenge} />
        {check.state !== undefined && <input type="hidden" name="state" value={check.state} />}
        <input type="hidden" name="consent" value={consent} />
        <button type="submit" name="decision" value="allow" className="btn btn--style-primary btn--size-medium btn--withoutPopup">
          <span className="btn__content"><span className="btn__label">Autoriser</span></span>
        </button>
        <button type="submit" name="decision" value="deny" className="btn btn--style-secondary btn--size-medium btn--withoutPopup">
          <span className="btn__content"><span className="btn__label">Refuser</span></span>
        </button>
      </form>
    </Box>
  )
}
