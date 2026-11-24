import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash'

/**
 * ThumbHash : aperçu flou de la photo en une vingtaine d’octets, calculé à l’envoi (champ `thumbhash` de Media, base64).
 * Sert de fond provisoire sous la photo pendant son chargement, sans requête supplémentaire.
 */
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')

/** Empreinte à partir de pixels RGBA déjà réduits (100 px au plus par côté : limite de l’algorithme). */
export const thumbHashOf = (width: number, height: number, rgba: Uint8Array) => b64(rgbaToThumbHash(width, height, rgba))

/** Image `data:` (PNG minuscule) à poser en fond ; `null` si l’empreinte est absente ou illisible. */
export function thumbHashDataUrl(hash?: string | null): string | null {
  if (!hash) return null
  try {
    return thumbHashToDataURL(Buffer.from(hash, 'base64'))
  } catch {
    return null
  }
}
