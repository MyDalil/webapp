'use client'

import '@livekit/components-styles'
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react'
import { useState } from 'react'
import Link from '@/platform/ui/Link'

/** Salle de visio LiveKit : caméra, micro, partage d’écran, discussion. Aucune application à installer. */
export function VideoRoom({ token, serverUrl, title, demo, backHref }: { token: string; serverUrl: string; title: string; demo: boolean; backHref: string }) {
  const [left, setLeft] = useState(false)
  if (left)
    return (
      <div className="visio-end">
        <h2>Consultation terminée.</h2>
        <p>Vous avez quitté la salle. Vous pouvez la rejoindre de nouveau tant qu’elle est ouverte.</p>
        <div className="visio-end-actions">
          <button type="button" className="button primary" onClick={() => setLeft(false)}>
            Rejoindre de nouveau
          </button>
          <Link className="button outline" href={backHref}>
            Retour à mes rendez-vous
          </Link>
        </div>
      </div>
    )
  return (
    <div className="visio-wrap">
      <div className="visio-head">
        <b>{title}</b>
        {demo && <span className="chip chip-plain">Exemple — aucune consultation réelle</span>}
      </div>
      <LiveKitRoom className="visio-room" data-lk-theme="default" token={token} serverUrl={serverUrl} connect video audio onDisconnected={() => setLeft(true)}>
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}
