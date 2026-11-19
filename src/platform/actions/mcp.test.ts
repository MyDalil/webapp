import { describe, expect, it } from 'vitest'
import { handleBody, handleMessage, type McpTools } from './mcp'
import { ActionError } from './run'
import type { ActionDef } from './types'

const tool = (name: string, readOnly = true): ActionDef => ({ name, title: name, description: name, module: 't', access: 'public', readOnly, input: { type: 'object', properties: {} }, run: async () => ({}) })
const tools: McpTools = {
  list: () => [tool('lire')],
  call: async (name, args) => {
    if ((args as { fail?: string }).fail === 'action') throw new ActionError('invalid_input', 'mauvaise entrée')
    if ((args as { fail?: string }).fail === 'crash') throw new Error('secret interne')
    return { name, ok: true }
  },
}
const rpc = (method: string, params?: unknown, id: number | string = 1) => ({ jsonrpc: '2.0', id, method, params })

describe('MCP', () => {
  it('initialize : version demandée si prise en charge, sinon 2025-06-18', async () => {
    expect((await handleMessage(rpc('initialize', { protocolVersion: '2025-03-26' }), tools))?.result).toMatchObject({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'dalil' } })
    expect((await handleMessage(rpc('initialize', { protocolVersion: '1999-01-01' }), tools))?.result).toMatchObject({ protocolVersion: '2025-06-18' })
  })
  it('notification : 202 sans corps', async () => {
    expect(await handleBody({ jsonrpc: '2.0', method: 'notifications/initialized' }, tools)).toEqual({ status: 202, body: null })
  })
  it('ping', async () => {
    expect(await handleMessage(rpc('ping'), tools)).toEqual({ jsonrpc: '2.0', id: 1, result: {} })
  })
  it('tools/list : seulement les outils fournis, avec annotations', async () => {
    const r = (await handleMessage(rpc('tools/list'), tools))?.result as { tools: { name: string; annotations: Record<string, boolean>; inputSchema: { type: string } }[] }
    expect(r.tools.map((t) => t.name)).toEqual(['lire'])
    expect(r.tools[0].annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false })
    expect(r.tools[0].inputSchema.type).toBe('object')
  })
  it('tools/call : texte JSON + structuredContent', async () => {
    const r = (await handleMessage(rpc('tools/call', { name: 'lire', arguments: {} }), tools))?.result as { content: { text: string }[]; structuredContent: unknown; isError: boolean }
    expect(r.isError).toBe(false)
    expect(r.structuredContent).toEqual({ name: 'lire', ok: true })
    expect(JSON.parse(r.content[0].text)).toEqual({ name: 'lire', ok: true })
  })
  it('tools/call : outil hors liste → -32602', async () => {
    expect((await handleMessage(rpc('tools/call', { name: 'publier_fiche' }), tools))?.error?.code).toBe(-32602)
  })
  it('tools/call : erreur d’action → isError, erreur interne masquée', async () => {
    const a = (await handleMessage(rpc('tools/call', { name: 'lire', arguments: { fail: 'action' } }), tools))?.result as { isError: boolean; content: { text: string }[] }
    expect(a).toMatchObject({ isError: true, content: [{ text: 'mauvaise entrée' }] })
    const b = (await handleMessage(rpc('tools/call', { name: 'lire', arguments: { fail: 'crash' } }), tools))?.result as { isError: boolean; content: { text: string }[] }
    expect(b.isError).toBe(true)
    expect(b.content[0].text).not.toContain('secret')
  })
  it('erreurs JSON-RPC : méthode inconnue, requête invalide', async () => {
    expect((await handleMessage(rpc('resources/list'), tools))?.error?.code).toBe(-32601)
    expect((await handleMessage({ id: 3, method: 'ping' }, tools))?.error).toMatchObject({ code: -32600 })
    expect((await handleMessage('x', tools))?.error?.code).toBe(-32600)
  })
  it('lot : réponses des requêtes seulement ; lot vide refusé', async () => {
    const r = await handleBody([rpc('ping', undefined, 1), { jsonrpc: '2.0', method: 'notifications/initialized' }, rpc('tools/list', undefined, 2)], tools)
    expect(r.status).toBe(200)
    expect((r.body as { id: number }[]).map((x) => x.id)).toEqual([1, 2])
    expect((await handleBody([], tools)).status).toBe(400)
  })
})
