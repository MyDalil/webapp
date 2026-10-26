import { redirect } from 'next/navigation'
import { currentMember } from '@/modules/membres'

export const dynamic = 'force-dynamic'

/** Ancienne page du prototype (profil test) : tout passe désormais par le compte membre. */
export default async function Page() {
  if (await currentMember()) redirect('/mon-compte')
  redirect('/connexion/particulier?tab=signup&next=%2Fmon-compte')
}
