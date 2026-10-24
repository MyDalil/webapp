/**
 * Contrôle et nettoyage des fichiers envoyés par les comptes publics, sans dépendance :
 * type réel vérifié par la signature (pas par l’extension), taille plafonnée, métadonnées
 * retirées (EXIF : position GPS, appareil, date) pour protéger la vie privée.
 */
/** Plafond de Vercel pour le corps d’une requête : 4,5 Mo. Les photos sont réduites dans le navigateur avant l’envoi. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export type CleanFile = { data: Buffer; mimetype: string; ext: string }
export type UploadError = { error: string }

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
const isPng = (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
const isWebp = (b: Buffer) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
const isPdf = (b: Buffer) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-'

/** JPEG : retire les segments APP1 (EXIF/XMP), APP13 (IPTC) et les commentaires. */
function stripJpeg(b: Buffer) {
  const out: Buffer[] = [b.subarray(0, 2)]
  let i = 2
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1]
    if (marker === 0xda) break // début des données image : on garde tout le reste
    const len = b.readUInt16BE(i + 2)
    const seg = b.subarray(i, i + 2 + len)
    if (!(marker === 0xe1 || marker === 0xed || marker === 0xfe)) out.push(seg)
    i += 2 + len
  }
  out.push(b.subarray(i))
  return Buffer.concat(out)
}

/** PNG : retire les blocs de métadonnées (eXIf, textes, date). */
function stripPng(b: Buffer) {
  const drop = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME'])
  const out: Buffer[] = [b.subarray(0, 8)]
  let i = 8
  while (i + 12 <= b.length) {
    const len = b.readUInt32BE(i)
    const type = b.toString('ascii', i + 4, i + 8)
    const chunk = b.subarray(i, i + 12 + len)
    if (!drop.has(type)) out.push(chunk)
    i += 12 + len
    if (type === 'IEND') break
  }
  return Buffer.concat(out)
}

/** WebP : retire les blocs EXIF et XMP et met à jour l’en-tête. */
function stripWebp(b: Buffer) {
  const out: Buffer[] = []
  let i = 12
  while (i + 8 <= b.length) {
    const type = b.toString('ascii', i, i + 4)
    const len = b.readUInt32LE(i + 4)
    const chunk = Buffer.from(b.subarray(i, i + 8 + len + (len % 2)))
    if (type === 'VP8X') chunk[8] &= ~(0x08 | 0x04) // drapeaux EXIF et XMP
    if (type !== 'EXIF' && type !== 'XMP ') out.push(chunk)
    i += 8 + len + (len % 2)
  }
  const body = Buffer.concat(out)
  const head = Buffer.alloc(12)
  head.write('RIFF', 0, 'ascii')
  head.writeUInt32LE(body.length + 4, 4)
  head.write('WEBP', 8, 'ascii')
  return Buffer.concat([head, body])
}

/** Photo publique (profil, avis) : JPEG, PNG ou WebP, métadonnées retirées. */
export function cleanImage(data: Buffer): CleanFile | UploadError {
  if (!data.length) return { error: 'Fichier vide.' }
  if (data.length > MAX_UPLOAD_BYTES) return { error: 'Photo trop lourde (4 Mo maximum).' }
  try {
    if (isJpeg(data)) return { data: stripJpeg(data), mimetype: 'image/jpeg', ext: 'jpg' }
    if (isPng(data)) return { data: stripPng(data), mimetype: 'image/png', ext: 'png' }
    if (isWebp(data)) return { data: stripWebp(data), mimetype: 'image/webp', ext: 'webp' }
  } catch {
    return { error: 'Photo illisible.' }
  }
  return { error: 'Format accepté : JPEG, PNG ou WebP.' }
}

/** Pièce justificative (privée) : photo ou PDF. */
export function cleanDocument(data: Buffer): CleanFile | UploadError {
  if (isPdf(data)) return data.length > MAX_UPLOAD_BYTES ? { error: 'Fichier trop lourd (4 Mo maximum).' } : { data, mimetype: 'application/pdf', ext: 'pdf' }
  const r = cleanImage(data)
  return 'error' in r && r.error.startsWith('Format') ? { error: 'Format accepté : photo (JPEG, PNG, WebP) ou PDF.' } : r
}

/** Lit un fichier d’un formulaire multipart. */
export async function readFile(v: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!v || typeof v === 'string') return null
  return Buffer.from(await v.arrayBuffer())
}
