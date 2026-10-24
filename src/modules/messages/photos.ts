import 'server-only'
import { payload } from '@/platform/http'
import type { CleanFile } from '@/platform/storage/images'

const KEEP_DAYS = 90

/** Enregistre les photos d’une contribution (déjà contrôlées et nettoyées), privées jusqu’à validation. */
export async function saveContributionPhotos(submission: number, files: CleanFile[], author: string) {
  const p = await payload()
  const now = new Date()
  for (const [i, f] of files.entries()) {
    await p.create({
      collection: 'contribution-photos',
      overrideAccess: true,
      data: {
        submission,
        author,
        license: 'CC BY 4.0',
        certifiedAt: now.toISOString(),
        filename: `contribution-${submission}-${i + 1}.${f.ext}`,
        mimetype: f.mimetype,
        size: f.data.length,
        expiresAt: new Date(now.getTime() + KEEP_DAYS * 864e5).toISOString(),
        data: f.data.toString('base64'),
      },
    })
  }
}

/** Tâche quotidienne : suppression des photos proposées de plus de 90 jours. */
export async function purgeContributionPhotos() {
  const p = await payload()
  const r = await p.delete({ collection: 'contribution-photos', where: { expiresAt: { less_than: new Date().toISOString() } }, overrideAccess: true })
  return r.docs.length
}
