import { preflight, protectedResourceResponse } from '@/platform/oauth/server'

/** Variante « chemin inséré » de RFC 9728, essayée en premier par les clients MCP pour /api/mcp/admin. */
export const GET = protectedResourceResponse
export const OPTIONS = preflight
