/**
 * Visio des consultations : le fournisseur n’est pas encore choisi (LiveKit Cloud, Jitsi auto-hébergé…).
 * Contrat : une salle privée par rendez-vous, ouverte seulement aux deux participants autour de l’heure,
 * aucun enregistrement. Tant qu’aucun fournisseur n’est configuré, la visio n’est pas réservable.
 */
export const videoEnabled = () => Boolean(process.env.VIDEO_PROVIDER)

export type VideoRoomRequest = { appointmentId: number | string; start: string; end: string }

/** Lien de la salle pour un rendez-vous (null tant qu’aucun fournisseur n’est branché). */
export async function createVideoRoom(_req: VideoRoomRequest): Promise<string | null> {
  return null
}
