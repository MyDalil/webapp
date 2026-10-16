import { currentMember, deleteMyAccount } from '@/modules/sante'
import { deleteServicesData } from '@/modules/services'
import { clean, fail, isEmail, json, payload } from '@/platform/http'
import { guard } from '@/platform/security/rateLimit'

/** Compte connecté (pour l’en-tête et le cercle d’inscription). */
export async function GET() {
  const m = await currentMember()
  return json({ member: m ? { firstName: m.firstName, kind: m.kind, verified: Boolean(m._verified), gender: m.gender ?? null } : null })
}

/** Inscription : champs contrôlés, email de confirmation envoyé automatiquement. */
export async function POST(req: Request) {
  const limited = await guard('signup', 5, 3600)
  if (limited) return limited
  const b = await req.json().catch(() => ({}))
  const email = clean(b.email, 200).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''
  if (!isEmail(email)) return fail('Adresse email invalide.')
  if (password.length < 10) return fail('Le mot de passe doit contenir au moins 10 caractères.')
  if (!clean(b.firstName) || !clean(b.lastName) || !clean(b.phone)) return fail('Prénom, nom et téléphone sont obligatoires.')
  if (b.terms !== true) return fail('Merci d’accepter les conditions d’utilisation et la politique de confidentialité.')
  const p = await payload()
  const exists = await p.count({ collection: 'members', where: { email: { equals: email } }, overrideAccess: true })
  if (exists.totalDocs) return fail('Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.', 409)
  await p.create({
    collection: 'members',
    overrideAccess: true,
    data: { email, password, firstName: clean(b.firstName, 80), lastName: clean(b.lastName, 80), phone: clean(b.phone, 30), kind: b.kind === 'pro' ? 'pro' : 'particulier', termsAcceptedAt: new Date().toISOString() },
  })
  return json({ ok: true }, 201)
}

/** Suppression définitive du compte, de ses rendez-vous, demandes de service, messages et avis. */
export async function DELETE() {
  const m = await currentMember()
  if (!m) return fail('Non connecté.', 401)
  await deleteServicesData(m)
  await deleteMyAccount(m)
  return json({ ok: true })
}
