import { currentMember, exportSanteData } from '@/modules/sante'
import { exportServicesData } from '@/modules/services'
import { exportClassifiedsData } from '@/modules/annonces'
import { fail } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** Téléchargement de toutes les données du compte (droit d’accès et de portabilité, RGPD et loi 18-07). */
export async function GET() {
  const member = await currentMember()
  if (!member) return fail('Non connecté.', 401)
  const limited = await guard('export', 5, 3600, `m${member.id}`)
  if (limited) return limited
  const data = {
    exporteLe: new Date().toISOString(),
    source: 'DALIL — mydalil.com',
    compte: { email: member.email, prenom: member.firstName, nom: member.lastName, telephone: member.phone, type: member.kind, genre: member.gender ?? null, emailVerifie: Boolean(member._verified), conditionsAccepteesLe: member.termsAcceptedAt, creeLe: member.createdAt },
    espacePersonnel: (member as { space?: unknown }).space ?? null,
    sante: await exportSanteData(member),
    annonces: await exportClassifiedsData(member),
    services: await exportServicesData(member),
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="mes-donnees-dalil-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store, private',
    },
  })
}
