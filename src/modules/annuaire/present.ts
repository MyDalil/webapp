import type { Place } from '@/payload-types'
import { RESULT_LABEL } from '@/modules/confiance'

/**
 * Présentation d’une fiche lieu (modèle validé par Rad, 2026-10-26) : texte professionnel, faits connus seulement,
 * provenance en bas de fiche. Pur, testé (`present.test.ts`).
 */
export function presentIntro(intro?: string | null): string | null {
  if (!intro) return null
  const t = intro
    .replace(/\s*Informations issues d[’']OpenStreetMap[^.]*\.?/gi, '')
    // Gestion et accès : montrés dans « En bref », pas répétés dans le texte.
    .replace(/\s*Géré par [^.]+\./g, '')
    .replace(/\s*Accès en fauteuil roulant signalé\./gi, '')
    .replace(/\s*\(wilaya (de |d[’'])([^)]+)\)\./, (_m, d: string, w: string) => `, dans la wilaya ${d}${w}.`)
    .trim()
  return t || null
}

export type Fact = { label: string; value: string }

/** Faits connus d’une fiche, dans un ordre stable : jamais une case « à confirmer ». */
export function factsOf(p: Pick<Place, 'category' | 'heritage' | 'inception' | 'criteria' | 'intro'> & { facts?: { label: string; value: string }[] | null }): Fact[] {
  const out: Fact[] = []
  const add = (label: string, value?: string | null) => {
    const v = (value ?? '').trim()
    if (v && !out.some((f) => f.label === label)) out.push({ label, value: v })
  }
  add('Catégorie', p.category)
  // Faits relevés (rédaction DALIL, OpenStreetMap, Wikidata) d’abord : plus précis que les champs génériques.
  for (const f of p.facts ?? []) add(f.label, f.value)
  add('Création', p.inception)
  add('Patrimoine', p.heritage)
  // Faits déjà écrits dans un texte importé (OpenStreetMap) : accès signalé.
  if (/Accès en fauteuil roulant signalé/i.test(p.intro ?? '')) add('Accès fauteuil', 'Signalé')
  const managed = /Géré par ([^.]+)\./.exec(p.intro ?? '')
  if (managed) add('Gestion', managed[1])
  for (const c of p.criteria ?? []) if (c.result && c.result !== 'pending') add(c.criterion, c.note || RESULT_LABEL[c.result] || c.result)
  return out
}
