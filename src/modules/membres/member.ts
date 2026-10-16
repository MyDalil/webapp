import 'server-only'
import { headers as nextHeaders } from 'next/headers'
import type { Member } from '@/payload-types'
import { payload as getPayload } from '@/platform/http'

/** Compte public connecté (null sinon). Partagé par les métiers via `@/modules/membres`. */
export async function currentMember(): Promise<Member | null> {
  const p = await getPayload()
  const { user } = await p.auth({ headers: await nextHeaders() })
  return user && (user as { collection?: string }).collection === 'members' ? (user as unknown as Member) : null
}
