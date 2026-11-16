import { createHmac } from 'crypto'
import { AccessToken } from 'livekit-server-sdk'
import { SITE } from './site'

/**
 * Visio des consultations — LiveKit (open source, Apache 2.0). Hébergé d’abord sur LiveKit Cloud (offre gratuite,
 * plafonnée : pas de facturation surprise), déplaçable plus tard sur un serveur DALIL sans changer ce code.
 * Contrat : une salle par rendez-vous, au nom impossible à deviner ; entrée seulement par la page DALIL `/visio/[id]`,
 * réservée au patient et au praticien du rendez-vous, connectés ; jeton d’accès court, 2 participants ; aucun enregistrement.
 * Activation : `VIDEO_PROVIDER=livekit`, `LIVEKIT_URL` (wss://…), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (variables Vercel).
 */
export const IMPLEMENTED_VIDEO_PROVIDERS: readonly string[] = ['livekit']

export const videoEnabled = () =>
  IMPLEMENTED_VIDEO_PROVIDERS.includes(process.env.VIDEO_PROVIDER ?? '') && Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)

export type VideoRoomRequest = { appointmentId: number | string; start: string; end: string; demo?: boolean }

/** Nom de salle stable et secret pour un rendez-vous. */
export const videoRoomName = (appointmentId: number | string) =>
  `rdv-${appointmentId}-${createHmac('sha256', `visio:${process.env.LIVEKIT_API_SECRET ?? ''}`).update(String(appointmentId)).digest('base64url').slice(0, 16)}`

/** Lien de la consultation : la page DALIL qui contrôle l’accès (null si la visio n’est pas activée). */
export async function createVideoRoom(req: VideoRoomRequest): Promise<string | null> {
  if (!videoEnabled()) return null
  return `${SITE}/visio/${req.appointmentId}`
}

/** Fenêtre d’ouverture de la salle : 15 min avant le début, 30 min après la fin ; dès la réservation pour l’exemple. */
export function videoWindow(start: string, end: string, demo = false) {
  return { opensAt: demo ? 0 : Date.parse(start) - 15 * 60e3, closesAt: Date.parse(end) + 30 * 60e3 }
}

/** Jeton d’entrée LiveKit pour un participant, valable jusqu’à la fermeture de la salle. */
export async function videoToken(input: { appointmentId: number | string; identity: string; name: string; closesAt: number }) {
  if (!videoEnabled()) return null
  const ttl = Math.max(60, Math.floor((input.closesAt - Date.now()) / 1000))
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: input.identity, name: input.name, ttl })
  at.addGrant({ room: videoRoomName(input.appointmentId), roomJoin: true, roomCreate: true, canPublish: true, canSubscribe: true, canPublishData: true, roomRecord: false })
  return { token: await at.toJwt(), serverUrl: process.env.LIVEKIT_URL as string }
}
