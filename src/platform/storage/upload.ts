import 'server-only'
import { randomUUID } from 'crypto'
import type { Payload } from 'payload'
import type { CleanFile } from './images'

/** Enregistre une photo envoyée par un compte (déjà nettoyée) : en ligne tout de suite, à contrôler par l’équipe. */
export async function savePublicPhoto(p: Payload, file: CleanFile, meta: { alt: string; uploadedBy: number }) {
  return p.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: meta.alt.slice(0, 160), moderation: 'to-check', uploadedBy: meta.uploadedBy },
    file: { data: file.data, mimetype: file.mimetype, name: `${randomUUID()}.${file.ext}`, size: file.data.length },
  })
}
