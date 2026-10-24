import type { Instrumentation } from 'next'

/** Suivi des erreurs serveur sans service tiers : journal Neon (/admin › Pilotage › Erreurs du site) + alerte email. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { recordError } = await import('@/platform/monitoring/errors')
  await recordError(err, { path: request.path, method: request.method, route: context.routePath, routeType: context.routeType })
}
