import { authorizationServerMetadata } from '@/platform/oauth/core'
import { disabled, oauthConfig, oauthJson, preflight } from '@/platform/oauth/server'

/** Métadonnées du serveur d’autorisation (RFC 8414). */
export function GET() {
  const cfg = oauthConfig()
  return cfg ? oauthJson(authorizationServerMetadata(cfg)) : disabled()
}
export const OPTIONS = preflight
