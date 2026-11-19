import 'server-only'
import type { Payload } from 'payload'
import { SITE } from '@/platform/mail'
import { readImage } from '@/platform/ai/vision'
import { altPrompt, clampAlt, needsAlt } from './altRules'

type MediaDoc = { id: number; alt?: string | null; filename?: string | null; url?: string | null; mimeType?: string | null; sizes?: Record<string, { url?: string | null; mimeType?: string | null } | undefined> }

/** Image à lire : format « carte » (800×600 WebP) si présent, sinon l’original. */
async function bytesOf(m: MediaDoc): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const card = m.sizes?.card?.url ? m.sizes.card : null
  const url = card?.url ?? m.url
  if (!url) return null
  const res = await fetch(url.startsWith('http') ? url : `${SITE}${url}`)
  if (!res.ok) return null
  const mime = (res.headers.get('content-type') ?? card?.mimeType ?? m.mimeType ?? '').split(';')[0].trim()
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime }
}

export type AltResult = { id: number; alt?: string; ignore?: string }

/** Génère et enregistre le texte alternatif d’une photo (seulement s’il manque, sauf `force`). */
export async function generateAlt(payload: Payload, id: number, opts: { context?: string; force?: boolean } = {}): Promise<AltResult> {
  const m = (await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })) as unknown as MediaDoc
  if (!opts.force && !needsAlt(m)) return { id, ignore: 'texte alternatif déjà présent' }
  const img = await bytesOf(m).catch(() => null)
  if (!img) return { id, ignore: 'image illisible' }
  const text = await readImage(img.bytes, img.mime, altPrompt(opts.context))
  if (!text) return { id, ignore: 'IA indisponible ou plafond atteint' }
  const alt = clampAlt(text)
  await payload.update({ collection: 'media', id, data: { alt }, overrideAccess: true, context: { altGenerated: true } })
  return { id, alt }
}

/** Photos sans texte alternatif (vide ou nom de fichier), par lots de 20. */
export async function mediaWithoutAlt(payload: Payload, limit = 20) {
  const out: number[] = []
  for (let page = 1; out.length < limit && page <= 50; page++) {
    const r = await payload.find({ collection: 'media', depth: 0, limit: 200, page, overrideAccess: true, sort: '-createdAt', select: { alt: true, filename: true } as never })
    for (const d of r.docs as unknown as MediaDoc[]) if (needsAlt(d) && out.length < limit) out.push(d.id)
    if (!r.hasNextPage) break
  }
  return out
}
