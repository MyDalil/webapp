import { fail, json } from '@/platform/http'
import { readSession } from '@/modules/membres'

export async function GET() {
  const s = await readSession()
  if (!s?.profile) return fail('Non connecté.', 401)
  return json({
    profile: s.profile,
    saved: s.state.favorites,
    onboarding: { territory: s.profile.territory || null, interest: s.profile.interest || null },
    applications: s.state.applications,
    diagnostics: s.state.diagnostics,
    contacts: s.state.contacts,
    meetings: [],
  })
}
