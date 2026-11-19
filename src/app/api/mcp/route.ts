import { PUBLIC } from '@/platform/actions/context'
import { allActions, newActionId, runAction } from '@/registry'
import { answer, langOfUrl, methodNotAllowed, preflight } from './http'
import { LIMITS, clientId, countCall, ipLimit } from './limits'

/** Serveur MCP public de DALIL : outils en lecture seule ouverts à tous (données publiées seulement). */
export const dynamic = 'force-dynamic'

const publicTools = () => allActions().filter((a) => a.readOnly && a.access === 'public')

export async function POST(req: Request) {
  const limited = await ipLimit('mcp', LIMITS.publicPerIp)
  if (limited) return limited
  const ip = await clientId()
  const lang = langOfUrl(req.url)
  return answer(req, {
    list: publicTools,
    call: async (name, args) => {
      // Chaque tools/call compte dans le même compteur que la requête (un lot ne contourne pas la limite).
      await countCall('mcp', ip, LIMITS.publicPerIp)
      return runAction(name, args, { principal: PUBLIC, channel: 'mcp', actionId: newActionId(), lang })
    },
  })
}

export const GET = methodNotAllowed
export const OPTIONS = preflight
