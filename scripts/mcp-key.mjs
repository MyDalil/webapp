// Génère une clé API nominative pour le serveur MCP d’administration de DALIL.
// Usage : node scripts/mcp-key.mjs prenom@mydalil.com
// La clé en clair s’affiche une seule fois : la donner à son titulaire. Seule l’empreinte va dans Vercel.
import { createHash, randomBytes } from 'node:crypto'

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!/^[^\s@:,]+@[^\s@:,]+\.[^\s@:,]{2,}$/.test(email)) {
  console.error('Usage : node scripts/mcp-key.mjs email@du-compte-admin')
  process.exit(1)
}
const key = `dalil_${randomBytes(32).toString('base64url')}`
const hash = createHash('sha256').update(key, 'utf8').digest('hex')
console.log(`Clé (à remettre au titulaire, ne s’affiche qu’une fois) :\n  ${key}\n`)
console.log(`Ligne à ajouter à DALIL_MCP_KEYS dans Vercel (séparer les lignes par des virgules) :\n  ${email}:${hash}\n`)
console.log('Le compte doit exister dans /admin (Users) avec ce même email ; ses droits suivent son rôle. Révoquer = retirer la ligne.')
