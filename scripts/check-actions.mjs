// Règle de Rad (25/11/2026) : tout se consulte sans compte ; toute action exige un compte connecté.
// Fermé par défaut : chaque route /api qui écrit (POST, PUT, PATCH, DELETE) doit vérifier la session
// et répondre 401/403 — sauf les routes publiques listées ici, avec leur raison. Le build échoue sinon.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = 'src/app/api'
const PUBLIC = {
  'members/login': 'connexion',
  'members/otp': 'code de connexion par email',
  'members/forgot-password': 'mot de passe oublié',
  'oauth/autoriser': 'connexion des comptes IA (OAuth)',
  'oauth/register': 'connexion des comptes IA (OAuth)',
  'oauth/revoke': 'connexion des comptes IA (OAuth)',
  'oauth/token': 'connexion des comptes IA (OAuth)',
  mcp: 'accès des IA en lecture (ChatGPT, Claude…)',
  'paiement/chargily': 'notification signée du paiement',
  'paiement/stripe': 'notification signée du paiement',
  m: 'mesure d’audience anonyme',
  subscribers: 'newsletter',
  'subscribers/unsubscribe': 'désinscription newsletter',
  assistant: 'barre de discussion (aide à la recherche)',
  'ia/demande': 'barre de recherche (l’IA reste réservée aux comptes vérifiés)',
  'admin/[...rest]': 'administration Payload (droits propres)',
}
const WRITE = /export\s+(async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/
const GUARD = /currentMember\(|readSession\(|\.auth\(|apiKey|SECRET|isStaff|requireStaff/
const REFUSE = /\b40[13]\b/

const files = []
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f === 'route.ts' && files.push(join(d, f))))
walk(ROOT)
const bad = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  if (!WRITE.test(src)) continue
  const route = relative(ROOT, f).replace(/\/route\.ts$/, '')
  if (route in PUBLIC) continue
  if (!(GUARD.test(src) && REFUSE.test(src))) bad.push(route)
}
if (bad.length) {
  console.error(`Actions sans contrôle de connexion :\n${bad.map((r) => `  /api/${r}`).join('\n')}\nAjoutez la vérification du compte (401), ou déclarez la route publique dans scripts/check-actions.mjs avec sa raison.`)
  process.exit(1)
}
console.log(`Actions OK (${files.length} routes : toute écriture exige un compte, sauf ${Object.keys(PUBLIC).length} routes publiques déclarées).`)
