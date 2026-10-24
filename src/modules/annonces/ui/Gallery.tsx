'use client'

import { useState } from 'react'

/** Photos d’une annonce : une grande photo, les vignettes pour changer. */
export function Gallery({ photos, title }: { photos: { thumb: string; cover: string; alt: string }[]; title: string }) {
  const [i, setI] = useState(0)
  if (!photos.length) return <div className="classified-cover is-empty" aria-label={`${title} : pas de photo`} />
  const p = photos[Math.min(i, photos.length - 1)]
  return (
    <div className="classified-gallery">
      <div className="classified-cover" role="img" aria-label={p.alt} style={{ backgroundImage: `url(${p.cover || p.thumb})` }} />
      {photos.length > 1 && (
        <div className="classified-thumbs" role="group" aria-label="Photos">
          {photos.map((x, k) => (
            <button key={x.thumb + k} type="button" aria-label={`Photo ${k + 1} sur ${photos.length}`} aria-pressed={k === i} style={{ backgroundImage: `url(${x.thumb})` }} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </div>
  )
}
