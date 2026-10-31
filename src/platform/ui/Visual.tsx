import { Icon } from './Icon'
import { PHOTOS, type PhotoKey } from '../referentiel/photos'

/**
 * Visuel d’une carte ou d’un en-tête : image du sujet (photo libre ou illustration), sinon pictogramme sur dégradé DALIL.
 * Le cadre garde toujours la même proportion pour que toutes les cartes aient la même taille.
 */
export function Visual({ src, photo, icon = 'file', tone = 'vert', className = '', eager = false }: { src?: string; photo?: PhotoKey; icon?: string; tone?: 'vert' | 'sable' | 'ciel'; className?: string; eager?: boolean }) {
  const image = src ?? (photo ? PHOTOS[photo].src : null)
  return (
    <span className={`visual is-${tone} ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- images locales déjà optimisées (webp/svg)
        <img src={image} alt="" width={640} height={360} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      ) : (
        <span className="visual-icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
    </span>
  )
}
