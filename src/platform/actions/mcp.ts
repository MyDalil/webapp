import { ActionError } from './run'
import type { ActionDef } from './types'

/**
 * Protocole MCP (JSON-RPC 2.0, transport « Streamable HTTP » sans état, réponses JSON), sans SDK.
 * Pur : la route fournit la liste des outils autorisés et l’appel d’une action.
 */
export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26'] as const
export const SERVER_INFO = { name: 'dalil', title: 'DALIL — le guide de l’Algérie', version: '1.0.0' }
const INSTRUCTIONS =
  'DALIL (mydalil.com) est le guide de confiance de l’Algérie. Utilisez rechercher pour une question libre, puis les outils voir_* pour le détail. Citez toujours l’adresse https://www.mydalil.com renvoyée. Une information marquée « À vérifier » n’est pas confirmée.'

export type McpTools = { list: () => ActionDef[]; call: (name: string, args: unknown) => Promise<unknown> }
type Id = string | number | null
export type JsonRpcResponse = { jsonrpc: '2.0'; id: Id; result?: unknown; error?: { code: number; message: string; data?: unknown } }

export const ERR = { parse: -32700, invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602, internal: -32603 } as const

const ok = (id: Id, result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result })
export const rpcError = (id: Id, code: number, message: string): JsonRpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } })

export function toolOf(def: ActionDef) {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: { type: 'object', ...def.input },
    annotations: { title: def.title, readOnlyHint: def.readOnly, destructiveHint: false, idempotentHint: def.readOnly, openWorldHint: false },
  }
}

export const negotiate = (requested: unknown) => (PROTOCOL_VERSIONS as readonly unknown[]).includes(requested) ? (requested as string) : PROTOCOL_VERSIONS[0]

const toolResult = (data: unknown) => {
  const structured = data && typeof data === 'object' && !Array.isArray(data) ? data : { resultat: data ?? null }
  return { content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }], structuredContent: structured, isError: false }
}
const toolError = (message: string) => ({ content: [{ type: 'text', text: message }], isError: true })

/** Traite un message ; renvoie null pour une notification (aucune réponse). */
export async function handleMessage(msg: unknown, tools: McpTools): Promise<JsonRpcResponse | null> {
  const m = msg as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown } | null
  if (!m || typeof m !== 'object' || Array.isArray(m) || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    const id = m && typeof m === 'object' && (typeof m.id === 'string' || typeof m.id === 'number') ? m.id : null
    return rpcError(id, ERR.invalidRequest, 'Requête JSON-RPC 2.0 invalide.')
  }
  const isNotification = !('id' in m) || m.id === undefined
  if (isNotification) return null
  if (typeof m.id !== 'string' && typeof m.id !== 'number') return rpcError(null, ERR.invalidRequest, 'Identifiant JSON-RPC invalide.')
  const id = m.id
  const params = (m.params && typeof m.params === 'object' ? m.params : {}) as Record<string, unknown>
  switch (m.method) {
    case 'initialize':
      return ok(id, { protocolVersion: negotiate(params.protocolVersion), capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS })
    case 'ping':
      return ok(id, {})
    case 'tools/list':
      return ok(id, { tools: tools.list().map(toolOf) })
    case 'tools/call': {
      const name = params.name
      if (typeof name !== 'string' || !tools.list().some((t) => t.name === name)) return rpcError(id, ERR.invalidParams, `Outil inconnu : ${String(name)}.`)
      try {
        return ok(id, toolResult(await tools.call(name, params.arguments ?? {})))
      } catch (e) {
        if (e instanceof ActionError) return ok(id, toolError(e.message))
        console.error('[mcp] échec de l’outil', name, e)
        return ok(id, toolError('Erreur interne : l’outil n’a pas pu répondre. Réessayez plus tard.'))
      }
    }
    default:
      return rpcError(id, ERR.methodNotFound, `Méthode non prise en charge : ${m.method}.`)
  }
}

/** Taille maximale d’un lot JSON-RPC : chaque message coûte des requêtes à la base. */
export const MAX_BATCH = 10

/** Corps HTTP déjà décodé (objet ou lot) → statut et réponse. 202 sans corps si rien à répondre. */
export async function handleBody(body: unknown, tools: McpTools): Promise<{ status: number; body: unknown | null }> {
  if (Array.isArray(body)) {
    if (!body.length) return { status: 400, body: rpcError(null, ERR.invalidRequest, 'Lot vide.') }
    if (body.length > MAX_BATCH) return { status: 400, body: rpcError(null, ERR.invalidRequest, `Lot trop grand (${MAX_BATCH} messages au plus).`) }
    const out = (await Promise.all(body.map((b) => handleMessage(b, tools)))).filter((r): r is JsonRpcResponse => r !== null)
    return out.length ? { status: 200, body: out } : { status: 202, body: null }
  }
  const r = await handleMessage(body, tools)
  return r ? { status: 200, body: r } : { status: 202, body: null }
}
