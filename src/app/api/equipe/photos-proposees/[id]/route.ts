import { headers } from 'next/headers'
import { isStaffUser } from '@/platform/access'
import { fail, payload } from '@/platform/http'

/** Consultation d’une photo proposée : équipe DALIL uniquement, jamais mise en cache. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await payload()
  const { user } = await p.auth({ headers: await headers() })
  if (!isStaffUser(user)) return fail('Accès réservé à l’équipe.', 401)
  const doc = await p.findByID({ collection: 'contribution-photos', id: Number((await params).id), overrideAccess: true, depth: 0, context: { withData: true } }).catch(() => null)
  if (!doc?.data) return fail('Photo introuvable ou déjà supprimée.', 404)
  return new Response(Buffer.from(doc.data, 'base64'), {
    headers: {
      'content-type': doc.mimetype ?? 'application/octet-stream',
      'content-disposition': `inline; filename="photo-${doc.id}.${doc.mimetype === 'application/pdf' ? 'pdf' : 'img'}"`,
      'cache-control': 'no-store, private',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; img-src 'self' data:; object-src 'self'; sandbox",
    },
  })
}
