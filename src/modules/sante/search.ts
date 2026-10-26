import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'
import type { Practitioner } from '@/payload-types'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { indexRows, removeRow, replaceType, type SearchRow } from '@/platform/search/store'
import { SPECIALTIES, specialtyLabel } from './specialties'

const wilayaName = (code?: string | null) => WILAYAS.find((w) => String(w.code) === code)?.name ?? ''

/** Ligne d’index d’un praticien publié. */
export function practitionerRow(p: Partial<Practitioner> & { id: number | string }): SearchRow | null {
  if (p.status !== 'published' || !p.slug || !p.name) return null
  const specs = ((p.specialties ?? []) as string[]).map(specialtyLabel)
  const groups = [...new Set(((p.specialties ?? []) as string[]).map((v) => SPECIALTIES.find((s) => s.value === v)?.group).filter(Boolean))]
  return {
    type: 'praticien',
    id: String(p.id),
    url: `/praticiens/${p.slug}`,
    title: p.name,
    subtitle: [specs.join(', '), p.city].filter(Boolean).join(' · '),
    wilaya: p.wilaya ?? null,
    badge: p.demo ? 'Démo' : 'Rendez-vous en ligne',
    boost: p.demo ? -0.6 : 0.4,
    text: [p.title, ...specs, ...groups, 'médecin docteur rendez-vous santé', p.cabinetName, p.city, p.address, wilayaName(p.wilaya)].filter(Boolean).join(' '),
  }
}

export const indexPractitioner: CollectionAfterChangeHook = async ({ doc, req }) => {
  try {
    const row = practitionerRow(doc)
    if (row) await indexRows(req.payload, [row])
    else await removeRow(req.payload, 'praticien', doc.id)
  } catch {
    // reconstruction quotidienne
  }
  return doc
}
export const unindexPractitioner: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await removeRow(req.payload, 'praticien', doc.id).catch(() => {})
  return doc
}

export async function reindexPractitioners(payload: Payload) {
  const { docs } = await payload.find({ collection: 'practitioners', where: { status: { equals: 'published' } }, depth: 0, limit: 10000, pagination: false, overrideAccess: true })
  const rows = docs.map(practitionerRow).filter((r): r is SearchRow => r !== null)
  await replaceType(payload, 'praticien', rows)
  return rows.length
}

const SYNONYMS: Record<string, string> = {
  'medecine-generale': 'generaliste medecin docteur',
  pediatrie: 'enfant bebe pediatre',
  gynecologie: 'gyneco femme grossesse enceinte',
  cardiologie: 'coeur cardiaque',
  dermatologie: 'peau dermato',
  ophtalmologie: 'yeux vue ophtalmo lunettes',
  orl: 'oreille nez gorge',
  psychiatrie: 'psy',
  dentiste: 'dents dentaire dentiste',
  orthodontie: 'appareil dentaire dents',
  'sage-femme': 'grossesse accouchement',
  kinesitherapie: 'kine reeducation',
  psychologie: 'psy therapie',
  dietetique: 'nutrition regime',
  hijama: 'ventouses',
}

/** Spécialités : une ligne chacune, vers la prise de rendez-vous filtrée. */
export function santeTaxonomyRows(): SearchRow[] {
  return [
    { type: 'rubrique', id: 'sante', url: '/praticiens', title: 'Santé : prendre rendez-vous', subtitle: 'Services', text: 'medecin docteur praticien rendez-vous consultation sante', boost: 0.8 },
    ...SPECIALTIES.map((s) => ({ type: 'categorie' as const, id: `sante:${s.value}`, url: `/praticiens?specialite=${s.value}`, title: s.label, subtitle: `Santé · ${s.group}`, text: ['rendez-vous', s.group, SYNONYMS[s.value] ?? ''].join(' '), boost: 1 })),
  ]
}
