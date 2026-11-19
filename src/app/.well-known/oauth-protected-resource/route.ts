import { preflight, protectedResourceResponse } from '@/platform/oauth/server'

/** Métadonnées de la ressource protégée (RFC 9728) : le serveur MCP admin. */
export const GET = protectedResourceResponse
export const OPTIONS = preflight
