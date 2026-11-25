import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { Place } from '@/payload-types'
import { sha256 } from '@/platform/storage/Media'
import { cleanImage } from '@/platform/storage/images'
import { slugify } from '@/platform/referentiel/slug'
import { PEOPLE_PHOTO, external, sized } from './photos'

/**
 * Tâche quotidienne `photos-libres` : copie dans la médiathèque (tailles WebP sur Vercel Blob) la photo libre des
 * adresses publiées qui n’ont pas encore de photo DALIL, les mieux classées d’abord. Crédit, licence et page source
 * sont recopiés sur la photo : l’attribution reste affichée. Passe bornée (nombre, temps) et rejouable : une adresse
 * servie a une photo et n’est plus sélectionnée.
 */

/** Plafond par passe (PHOTOS_IMPORT_DAILY_MAX, défaut 6 : offre gratuite Vercel Blob, 2 000 écritures par mois, 5 par photo). */
export const dailyPhotosMax = (env: string | undefined = process.env.PHOTOS_IMPORT_DAILY_MAX) => {
  const n = Number(env)
  return env !== undefined && env !== '' && Number.isInteger(n) && n >= 0 ? n : 6
}

/** Politique User-Agent de Wikimedia : application identifiée, avec un contact. */
export const PHOTOS_USER_AGENT = 'DALIL/1.0 (https://www.mydalil.com; salam@mydalil.com)'
/** Largeur demandée : standard chez Wikimedia (les tailles libres sont limitées depuis 2026), suffisante pour nos formats. */
// 1920 px (largeur standard Wikimedia) : assez large pour que la médiathèque produise aussi la couverture WebP 1600.
const WIDTH = 1920
/** Plafond de poids d’une image téléchargée (celui des photos envoyées par les comptes). */
const MAX_BYTES = 4 * 1024 * 1024
/** Seules les sources prévues sont appelées : jamais une adresse quelconque saisie dans une fiche. */
const HOSTS = /(^|\.)wikimedia\.org$/

export type PhotosReport = {
  importees: number
  reutilisees: number
  ignorees: number
  erreurs: number
  arret?: 'plafond-de-la-passe' | 'temps-ecoule' | 'limite-de-la-source' | 'erreurs-repetees'
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>
type Opts = { max?: number; budgetMs?: number; timeoutMs?: number; pauseMs?: number; fetch?: Fetch; now?: () => number }
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
type Candidate = Pick<Place, 'id' | 'name' | 'slug' | 'photos' | 'externalPhotos'>
type Free = NonNullable<Place['externalPhotos']>[number]

/**
 * Adresses publiées, hors corbeille, avec une photo libre exploitable et aucune photo de la médiathèque — par score
 * décroissant. Requête SQL : le filtre « aucune photo » porte sur la table de liaison, et rien n’est chargé en trop.
 */
async function candidates(payload: Payload, limit: number): Promise<number[]> {
  const { rows } = await (payload.db as unknown as Db).drizzle.execute(sql`
    SELECT p.id FROM places p
    WHERE p._status = 'published' AND p.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM places_external_photos e WHERE e._parent_id = p.id AND e.url IS NOT NULL AND e.url <> '' AND e.url !~* ${PEOPLE_PHOTO.source})
      AND NOT EXISTS (SELECT 1 FROM places_rels r WHERE r.parent_id = p.id AND r.path = 'photos')
      AND NOT EXISTS (SELECT 1 FROM photos_libres_echecs f WHERE f.place_id = p.id AND f.at > now() - interval '30 days')
    ORDER BY p.score DESC NULLS LAST, p.id
    LIMIT ${limit}`)
  return rows.map((r) => Number(r.id))
}

/** Échec durable (introuvable, trop lourde, erreur) : l’adresse n’est pas retentée pendant 30 jours. */
async function remember(payload: Payload, id: number, raison: string) {
  await (payload.db as unknown as Db).drizzle.execute(sql`
    INSERT INTO photos_libres_echecs (place_id, at, raison) VALUES (${id}, now(), ${raison.slice(0, 200)})
    ON CONFLICT (place_id) DO UPDATE SET at = now(), raison = excluded.raison`)
}

/** Lecture bornée : coupe dès MAX_BYTES, même sans en-tête content-length. */
async function readCapped(res: Response): Promise<Buffer | null> {
  if (!res.body) return Buffer.from(await res.arrayBuffer())
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {})
      return null
    }
    parts.push(value)
  }
  return Buffer.concat(parts)
}

type Download = { data: Buffer; mimetype: string; ext: string } | { stop: number } | { skip: string }

async function download(x: Free, opts: { fetch: Fetch; timeoutMs: number }): Promise<Download> {
  let url: URL
  try {
    url = new URL(sized(x.url, WIDTH, x.width))
  } catch {
    return { skip: 'adresse de photo illisible' }
  }
  if (url.protocol !== 'https:' || !HOSTS.test(url.hostname)) return { skip: `source non prévue (${url.hostname})` }
  const res = await opts.fetch(url.href, { headers: { 'User-Agent': PHOTOS_USER_AGENT, Accept: 'image/jpeg,image/png,image/webp' }, signal: AbortSignal.timeout(opts.timeoutMs) })
  // Redirection vers un autre hôte : refusée (le serveur n’appelle que Wikimedia).
  if (res.url && !HOSTS.test(new URL(res.url).hostname)) return { skip: 'redirection hors Wikimedia' }
  // 429/503 : ralentir ; 401/403 : accès refusé (politique de la source) — dans les deux cas, arrêt de la passe.
  if ([401, 403, 429, 503].includes(res.status)) return { stop: res.status }
  if (res.status === 404 || res.status === 410) return { skip: `photo introuvable (${res.status})` }
  if (!res.ok) throw new Error(`réponse ${res.status}`)
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return { skip: 'photo trop lourde' }
  // Type réel vérifié par la signature, métadonnées (EXIF, GPS) retirées, poids plafonné.
  const data = await readCapped(res)
  if (!data) return { skip: 'photo trop lourde' }
  const clean = cleanImage(data)
  return 'error' in clean ? { skip: clean.error } : clean
}

/** Photo de la médiathèque portant le crédit de la photo libre : existante (même empreinte) ou créée. */
async function mediaFor(payload: Payload, place: Candidate, x: Free, file: { data: Buffer; mimetype: string; ext: string }): Promise<{ id: number; reused: boolean }> {
  const hash = sha256(file.data)
  const license = { credit: x.author, license: x.license, sourceUrl: x.page }
  const { docs } = await payload.find({ collection: 'media', where: { hash: { equals: hash } }, limit: 1, depth: 0, overrideAccess: true, select: { credit: true, license: true, sourceUrl: true } })
  // `altGenerated` : le nom de l’adresse suffit, pas de texte alternatif demandé à l’IA.
  const context = { altGenerated: true, skipAudit: true }
  if (docs[0]) {
    // Photo déjà présente sans crédit : on le pose, l’attribution est due par la licence.
    if (!docs[0].license && !docs[0].sourceUrl) await payload.update({ collection: 'media', id: docs[0].id, data: license, overrideAccess: true, context })
    return { id: docs[0].id, reused: true }
  }
  const m = await payload.create({
    collection: 'media',
    overrideAccess: true,
    context,
    data: { alt: place.name, moderation: 'ok', ...license },
    file: { data: file.data, mimetype: file.mimetype, name: `${slugify(place.slug ?? place.name) || 'adresse'}-${hash.slice(0, 8)}.${file.ext}`, size: file.data.length },
  })
  return { id: m.id, reused: false }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function importFreePhotos(payload: Payload, opts: Opts = {}): Promise<PhotosReport> {
  const max = opts.max ?? dailyPhotosMax()
  const out: PhotosReport = { importees: 0, reutilisees: 0, ignorees: 0, erreurs: 0 }
  if (max <= 0) return out
  const now = opts.now ?? Date.now
  const deadline = now() + (opts.budgetMs ?? 60_000)
  const net = { fetch: opts.fetch ?? (fetch as Fetch), timeoutMs: opts.timeoutMs ?? 15_000 }
  const pauseMs = opts.pauseMs ?? 200
  // Marge : une photo introuvable ou illisible ne prend pas la place d’une adresse suivante.
  const ids = await candidates(payload, max * 2)
  if (!ids.length) return out
  const { docs } = await payload.find({ collection: 'places', where: { id: { in: ids } }, limit: ids.length, pagination: false, depth: 0, overrideAccess: true, select: { name: true, slug: true, photos: true, externalPhotos: true } })
  const byId = new Map((docs as Candidate[]).map((d) => [d.id, d]))
  let called = false
  let streak = 0
  for (const id of ids) {
    const place = byId.get(id)
    if (!place) continue
    if (out.importees + out.reutilisees >= max) {
      out.arret = 'plafond-de-la-passe'
      break
    }
    // Marge de 20 s : une photo (téléchargement, tailles WebP, envoi Blob) ne dépasse jamais le budget.
    if (now() + 20_000 >= deadline) {
      out.arret = 'temps-ecoule'
      break
    }
    const x = external(place)[0]
    if (!x || place.photos?.length) {
      out.ignorees++
      continue
    }
    try {
      if (called && pauseMs) await wait(pauseMs)
      called = true
      const file = await download(x, net)
      if ('stop' in file) {
        // 429 ou 503 : la source demande de ralentir. On s’arrête net, la passe de demain reprend au même endroit.
        payload.logger?.warn?.(`Photos libres : arrêt de la passe, la source a répondu ${file.stop}`)
        out.arret = 'limite-de-la-source'
        break
      }
      if ('skip' in file) {
        payload.logger?.warn?.(`Photos libres : adresse ${id} ignorée — ${file.skip}`)
        await remember(payload, id, file.skip).catch(() => {})
        out.ignorees++
        continue
      }
      const media = await mediaFor(payload, place, x, file)
      // Mise à jour technique (sans `_status`) : la fiche reste publiée, aucun brouillon créé ; pas de traduction relancée.
      await payload.update({
        collection: 'places',
        id,
        overrideAccess: true,
        context: { skipAudit: true, skipTranslate: true, keepScore: true },
        data: { photos: [media.id, ...(place.photos ?? []).map((m) => (typeof m === 'object' ? m.id : m))] },
      })
      if (media.reused) out.reutilisees++
      else out.importees++
      streak = 0
    } catch (e) {
      out.erreurs++
      payload.logger?.warn?.(`Photos libres : adresse ${id} en erreur — ${(e as Error).message.slice(0, 160)}`)
      await remember(payload, id, (e as Error).message).catch(() => {})
      // Trois erreurs de suite (réseau, stockage) : la cause est générale, inutile d’insister.
      if (++streak >= 3) {
        out.arret = 'erreurs-repetees'
        break
      }
    }
  }
  return out
}
