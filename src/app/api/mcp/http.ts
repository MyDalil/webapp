import 'server-only'
import { handleBody, rpcError, type McpTools } from '@/platform/actions/mcp'
import { isLang } from '@/platform/i18n'
import type { Lang } from '@/platform/actions/types'

/** En-têtes CORS : clients MCP web (claude.ai, chatgpt.com…). Jeton Bearer, jamais de cookie. */
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, mcp-protocol-version, mcp-session-id, accept',
  'access-control-expose-headers': 'www-authenticate, mcp-protocol-version',
  'access-control-max-age': '86400',
}

export const reply = (status: number, body: unknown | null, extra: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...CORS, 'cache-control': 'no-store', ...(body === null ? {} : { 'content-type': 'application/json' }), ...extra } })

export const langOfUrl = (url: string): Lang => {
  const l = new URL(url).searchParams.get('lang')
  return isLang(l) ? l : 'fr'
}

/** Lit le corps JSON (64 Ko au plus) et répond selon le protocole. */
export async function answer(req: Request, tools: McpTools): Promise<Response> {
  const text = await req.text()
  if (text.length > 65536) return reply(413, rpcError(null, -32600, 'Requête trop volumineuse.'))
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return reply(400, rpcError(null, -32700, 'JSON illisible.'))
  }
  const r = await handleBody(body, tools)
  return reply(r.status, r.body)
}

export const methodNotAllowed = () => reply(405, null, { allow: 'POST, OPTIONS' })
export const preflight = () => reply(204, null)
