import { NextResponse } from 'next/server'
import { completeSignup, sendCode, verifyCode } from '@/modules/membres'
import { guard } from '@/platform/security/rateLimit'

/** Code de connexion par email : `send` (email), `verify` (défi + code), `complete` (ticket + identité). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const limited = await guard('otp', 30, 3600)
  if (limited) return limited
  const r = b.action === 'send' ? await sendCode(b.email) : b.action === 'verify' ? await verifyCode(b.challenge, b.code) : b.action === 'complete' ? await completeSignup(b) : { status: 400, body: { error: 'Action inconnue.' } }
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if ('cookie' in r && r.cookie) headers['set-cookie'] = r.cookie
  return NextResponse.json(r.body, { status: r.status, headers })
}
