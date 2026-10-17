import { clean, fail, isEmail, json } from '@/platform/http'
import { readSession } from '@/modules/membres'
import { record, saveContributionPhotos } from '@/modules/messages'
import { guard } from '@/platform/security/rateLimit'
import { cleanImage, readFile, type CleanFile } from '@/platform/storage/images'

const MAX_PHOTOS = 3

/**
 * Contribution d’un habitant (lieu, activité, événement, correction, lieu fermé, photo) : jamais publiée
 * automatiquement. Les photos sont gardées privées, avec l’auteur et la licence CC BY 4.0 acceptée.
 */
export async function POST(req: Request) {
  const limited = await guard('contribution', 10, 3600)
  if (limited) return limited
  const fd = await req.formData().catch(() => null)
  if (!fd) return fail('Formulaire invalide.')
  if (clean(fd.get('website'))) return json({ ok: true })
  const data: Record<string, unknown> = {}
  const photos: CleanFile[] = []
  for (const [k, v] of fd.entries()) {
    if (k === 'website') continue
    if (typeof v === 'string') data[k] = clean(v, 5000)
    else if (k === 'photos' && v.size) {
      if (photos.length >= MAX_PHOTOS) return fail(`${MAX_PHOTOS} photos maximum.`)
      const f = cleanImage((await readFile(v))!)
      if ('error' in f) return fail(f.error)
      photos.push(f)
    }
  }
  const title = clean(data.title, 200)
  if (!title) return fail('Indiquez le nom du lieu ou de l’information.')
  const email = clean(data.email, 200)
  if (email && !isEmail(email)) return fail('Adresse email invalide.')
  const author = clean(data.photoAuthor, 120)
  if (photos.length && (data.licenseOk !== 'on' || !author)) return fail('Pour envoyer une photo, indiquez le nom à créditer et confirmez en être l’auteur (licence CC BY 4.0).')
  if (photos.length) data.photos = `${photos.length} photo${photos.length > 1 ? 's' : ''} — voir « Photos proposées »`
  delete data.licenseOk
  const s = await readSession()
  const id = await record('contribution', title, data, email, s?.sid)
  if (photos.length) await saveContributionPhotos(id, photos, author)
  return json({ ok: true })
}
