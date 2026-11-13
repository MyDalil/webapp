/**
 * Visio des consultations : le fournisseur n’est pas encore choisi (LiveKit Cloud, Jitsi auto-hébergé…).
 * Contrat : une salle privée par rendez-vous, ouverte seulement aux deux participants autour de l’heure,
 * aucun enregistrement.
 * La visio n’est réservable que si `VIDEO_PROVIDER` désigne un fournisseur réellement implémenté ici
 * (définir la variable seule ne suffit plus). Aujourd’hui : aucun.
 */
export const IMPLEMENTED_VIDEO_PROVIDERS: readonly string[] = []

export const videoEnabled = () => IMPLEMENTED_VIDEO_PROVIDERS.includes(process.env.VIDEO_PROVIDER ?? '')

export type VideoRoomRequest = { appointmentId: number | string; start: string; end: string }

/** Lien de la salle pour un rendez-vous (null si aucun fournisseur implémenté ou en cas d’échec du fournisseur). */
export async function createVideoRoom(_req: VideoRoomRequest): Promise<string | null> {
  if (!videoEnabled()) return null
  return null
}
