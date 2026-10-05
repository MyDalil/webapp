// Extrait les données structurées du prototype : secteurs (catalog), guides, wilayas.
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
const A = 'legacy/assets'
const file = (p) => fs.readdirSync(A).find((f) => f.startsWith(p))
const sectors = (await import(pathToFileURL(path.resolve(A, file('catalog-'))).href)).t
const diag = fs.readFileSync(path.join(A, file('diagnostic-wizard-')), 'utf8')
const guidesSrc = diag.match(/s=(\[\{slug:`preparer-son-installation`[\s\S]*?\}\]),c=n\(\)/)[1]
const guides = new Function(`return ${guidesSrc}`)()
const app = fs.readFileSync(path.join(A, file('application-form-')), 'utf8')
const names = app.match(/i=`([^`]+)`\.split/)[1].split('.')
const trans = new Function(`return ${app.match(/a=(\[`Aflou`[^\]]*\])/)[1]}`)()
const wilayas = [...names.map((name, i) => ({ code: i + 1, name })), ...trans.map((name, i) => ({ code: 59 + i, name, transition: true }))]
const out = `// Généré par scripts/extract-catalog.mjs depuis le prototype DALIL — données de référence.
export type Sector = { slug: string; title: string; description: string; categories: string[]; criteria: string[]; guides: string[] }
export type GuideRef = { slug: string; title: string; category: string; summary: string; keywords: string[]; sourceIds: string[]; steps: string[] }
export const SECTORS: Sector[] = ${JSON.stringify(sectors, null, 1)}
export const GUIDES: GuideRef[] = ${JSON.stringify(guides, null, 1)}
export const WILAYAS: { code: number; name: string; transition?: boolean }[] = ${JSON.stringify(wilayas)}
`
fs.writeFileSync('src/content/catalog.ts', out)
console.log(sectors.length, 'secteurs', guides.length, 'guides', wilayas.length, 'wilayas')
