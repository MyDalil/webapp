// Vérifie les frontières entre métiers (voir AGENTS.md) :
// 1. hors d’un module, on n’y entre que par sa porte : @/modules/<m>, /ui ou /collections ;
// 2. src/platform (le socle) ne dépend d’aucun module métier.
// Sans dépendance : node scripts/check-boundaries.mjs (lancé par la CI et `pnpm check`).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const src = join(root, 'src')
const skip = [join(src, 'migrations'), join(src, 'app', '(payload)', 'admin', 'importMap.js')]
const files = []
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (skip.some((s) => p.startsWith(s))) continue
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(ts|tsx|js|mjs)$/.test(n)) files.push(p)
  }
}
walk(src)

const spec = /(?:from|import)\s*\(?\s*['"](@\/modules\/[^'"]+)['"]/g
const errors = []
for (const f of files) {
  const rel = relative(src, f).split(sep).join('/')
  const own = rel.startsWith('modules/') ? rel.split('/')[1] : null
  const text = readFileSync(f, 'utf8')
  for (const m of text.matchAll(spec)) {
    const [mod, ...rest] = m[1].replace('@/modules/', '').split('/')
    const line = text.slice(0, m.index).split('\n').length
    if (rel.startsWith('platform/')) errors.push(`${rel}:${line} — le socle importe le module « ${mod} »`)
    else if (mod !== own && rest.length && !(rest.length === 1 && ['ui', 'collections'].includes(rest[0])))
      errors.push(`${rel}:${line} — ${m[1]} : passer par @/modules/${mod}, /ui ou /collections`)
    else if (mod === own && rest.length) errors.push(`${rel}:${line} — import interne au module : utiliser un chemin relatif`)
  }
}
if (errors.length) {
  console.error(`Frontières non respectées (${errors.length}) :\n` + errors.join('\n'))
  process.exit(1)
}
console.log(`Frontières OK (${files.length} fichiers).`)
