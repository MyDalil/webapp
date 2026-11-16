/**
 * Visio des consultations — fournisseur : Daily (daily.co), salle ouverte dans le navigateur, sans application.
 * Contrat : une salle privée par rendez-vous (nom aléatoire impossible à deviner, 2 participants au plus),
 * ouverte 15 min avant le début et fermée 30 min après la fin, aucun enregistrement.
 * La visio n’est réservable que si `VIDEO_PROVIDER` désigne un fournisseur implémenté ici ET que sa clé existe.
 * Activation : `VIDEO_PROVIDER=daily` et `DAILY_API_KEY` (variables Vercel).
 */
export const IMPLEMENTED_VIDEO_PROVIDERS: readonly string[] = ['daily']

export const videoEnabled = () => IMPLEMENTED_VIDEO_PROVIDERS.includes(process.env.VIDEO_PROVIDER ?? '') && Boolean(process.env.DAILY_API_KEY)

export type VideoRoomRequest = { appointmentId: number | string; start: string; end: string; demo?: boolean }

const roomName = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `dalil-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24)}`
}

/** Lien de la salle pour un rendez-vous (null si aucun fournisseur implémenté ou en cas d’échec du fournisseur). */
export async function createVideoRoom(req: VideoRoomRequest): Promise<string | null> {
  if (!videoEnabled()) return null
  const start = Date.parse(req.start)
  const end = Date.parse(req.end)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  // Démonstration : salle ouverte tout de suite, pour essayer la visio sans attendre l’heure du créneau.
  const nbf = req.demo ? undefined : Math.floor((start - 15 * 60e3) / 1000)
  const exp = Math.floor((end + 30 * 60e3) / 1000)
  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: roomName(),
      privacy: 'public',
      properties: { nbf, exp, eject_at_room_exp: true, max_participants: 2, enable_recording: false, enable_chat: true, enable_prejoin_ui: true, lang: 'fr' },
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!res?.ok) return null
  const room = (await res.json().catch(() => null)) as { url?: string } | null
  return room?.url ?? null
}
