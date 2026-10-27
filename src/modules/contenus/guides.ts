import { getPage, textOf, type Node } from './content'
import type { PhotoKey } from '@/platform/referentiel/photos'

/** Guide lu depuis la page du prototype (titre, étapes, sources datées) pour le rendu « application ». */
export type GuideSourceLink = { title: string; url: string; publisher: string; date: string | null }
export type GuideView = { slug: string; label: string; title: string; lead: string; disclosure: string; steps: string[]; sources: GuideSourceLink[] }

type El = ['el', string, Record<string, unknown>, Node[]]
const isEl = (n: Node): n is El => Array.isArray(n) && n[0] === 'el'
const kids = (n: Node): Node[] => (Array.isArray(n) ? (n[0] === 'el' ? n[3] : n[0] === 'link' ? n[2] : []) : [])

/** Parcours en profondeur : tous les éléments qui vérifient `test`. */
function findAll(nodes: Node[], test: (n: El) => boolean, out: El[] = []): El[] {
  for (const n of nodes) {
    if (isEl(n) && test(n)) out.push(n)
    findAll(kids(n), test, out)
  }
  return out
}
const cls = (n: El, c: string) => String(n[2].className ?? '').split(/\s+/).includes(c)

export async function guideView(slug: string): Promise<GuideView | null> {
  const page = await getPage(`/guides/${slug}`)
  if (!page) return null
  const hero = findAll(page.content, (n) => cls(n, 'subpage-hero'))[0]
  const heroNodes = hero ? [hero] : page.content
  const title = textOf(findAll(heroNodes, (n) => n[1] === 'h1').slice(0, 1))
  const label = textOf(findAll(heroNodes, (n) => cls(n, 'section-label')).slice(0, 1))
  const lead = textOf(findAll(heroNodes, (n) => n[1] === 'p').slice(0, 1))
  const disclosure = textOf(findAll(page.content, (n) => cls(n, 'guide-disclosure')).slice(0, 1))
  const steps = findAll(page.content, (n) => cls(n, 'guide-steps')).flatMap((ol) => ol[3].filter(isEl).map((li) => textOf(li[3])))
  const aside = findAll(page.content, (n) => cls(n, 'guide-sources'))[0]
  const sources: GuideSourceLink[] = aside
    ? aside[3].filter(isEl).flatMap((p) => {
        const a = p[3].find((c): c is El => isEl(c) && c[1] === 'a')
        if (!a) return []
        const small = textOf(p[3].filter((c) => isEl(c) && c[1] === 'small'))
        const [publisher, consulted] = small.split('·').map((s) => s.trim())
        return [{ title: textOf(a[3]).replace(/\s*↗$/, ''), url: String(a[2].href), publisher: publisher || '', date: consulted?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null }]
      })
    : []
  return { slug, label, title, lead, disclosure, steps, sources }
}

/** Visuel de chaque guide : photo réelle seulement quand elle montre le sujet, sinon pictogramme sur dégradé. */
export type GuideVisual = { photo?: PhotoKey; icon: string; tone: 'vert' | 'sable' | 'ciel' }
export const GUIDE_VISUALS: Record<string, GuideVisual> = {
  'preparer-son-installation': { photo: 'aeroport', icon: 'home', tone: 'ciel' },
  'choisir-sa-ville': { photo: 'alger', icon: 'pin', tone: 'vert' },
  'documents-et-demarches': { photo: 'mairie', icon: 'file', tone: 'ciel' },
  logement: { photo: 'logement', icon: 'home', tone: 'sable' },
  'ecole-et-famille': { photo: 'ecole', icon: 'school', tone: 'ciel' },
  sante: { photo: 'hopital', icon: 'health', tone: 'vert' },
  'budget-et-banque': { photo: 'poste', icon: 'cash', tone: 'sable' },
  'travail-et-entreprise': { icon: 'briefcase', tone: 'sable' },
  transport: { photo: 'tramway', icon: 'car', tone: 'ciel' },
  'internet-et-telecoms': { photo: 'telecom', icon: 'list', tone: 'ciel' },
  'decouvrir-algerie': { photo: 'djanet', icon: 'pin', tone: 'sable' },
  'sorties-en-famille': { photo: 'jardin', icon: 'users', tone: 'vert' },
  restaurants: { photo: 'couscous', icon: 'heart', tone: 'sable' },
  pharmacies: { photo: 'pharmacie', icon: 'health', tone: 'vert' },
  'services-du-quotidien': { icon: 'grid', tone: 'vert' },
  'vie-musulmane': { photo: 'tlemcen', icon: 'building', tone: 'vert' },
  'hajj-et-omra': { photo: 'kaaba', icon: 'building', tone: 'sable' },
}
