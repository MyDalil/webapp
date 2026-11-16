export const PRODUCTION_SITE = 'https://www.mydalil.com'
export const PREVIEW_SITE = 'https://preview.mydalil.com'

const defaultSite = (vercelEnv?: string) => (vercelEnv === 'preview' ? PREVIEW_SITE : PRODUCTION_SITE)

export function siteForEnvironment(vercelEnv?: string, explicitUrl?: string) {
  if (!explicitUrl) return defaultSite(vercelEnv)
  try {
    const url = new URL(explicitUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname.endsWith('.vercel.app')) return defaultSite(vercelEnv)
    return url.origin
  } catch {
    return defaultSite(vercelEnv)
  }
}

export const SITE = siteForEnvironment(process.env.VERCEL_ENV, process.env.NEXT_PUBLIC_SITE_URL)
