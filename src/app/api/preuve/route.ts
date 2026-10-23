import { json } from '@/platform/http'
import { newChallenge } from '@/platform/security/proof'
import { guard } from '@/platform/security/rateLimit'

/** Défi anti-robot des formulaires publics (voir platform/security/proofCore.ts). */
export async function GET() {
  const limited = await guard('preuve-defi', 120, 3600)
  if (limited) return limited
  return json(await newChallenge())
}
