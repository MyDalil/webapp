import { allowed } from '@/platform/actions/context'
import { resolvePrincipal } from '@/platform/auth/apiKeys'
import { oauthConfig, wwwAuthenticate } from '@/platform/oauth/server'
import { actionsFor, newActionId, runAction } from '@/registry'
import { answer, langOfUrl, methodNotAllowed, preflight, reply } from '../http'
import { LIMITS, accountLimit, countCall, ipLimit } from '../limits'

/** Serveur MCP de l’équipe : clé API nominative ou jeton OAuth ; outils selon le rôle du compte. */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Limite large par IP avant authentification (essais de jetons), puis limite par compte.
  const limited = await ipLimit('mcp-admin', LIMITS.adminPerIp)
  if (limited) return limited
  const principal = await resolvePrincipal(req)
  if (principal.kind !== 'staff' || !allowed('staff', principal))
    return reply(401, { error: 'Authentification requise : clé API DALIL ou connexion OAuth d’un compte de l’équipe.' }, { 'www-authenticate': wwwAuthenticate(oauthConfig()) })
  const perAccount = await accountLimit(principal.userId)
  if (perAccount) return perAccount
  const lang = langOfUrl(req.url)
  return answer(req, {
    // Aucune action d’administration qui écrit (publier, arrêt général…) n’est exposée aux IA.
    list: () => actionsFor(principal).filter((a) => a.readOnly || a.access !== 'admin'),
    call: async (name, args) => {
      await countCall('mcp-admin-compte', `user:${principal.userId}`, LIMITS.adminPerAccount)
      return runAction(name, args, { principal, channel: 'mcp', actionId: newActionId(), lang })
    },
  })
}

export const GET = methodNotAllowed
export const OPTIONS = preflight
