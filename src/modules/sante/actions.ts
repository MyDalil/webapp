import 'server-only'
import type { Practitioner } from '@/payload-types'
import type { ActionDef } from '@/platform/actions/types'
import { S, absoluteUrl, limitOf, slugFrom, wilayaCode, wilayaLabel } from '@/platform/actions'
import { algiersDate, algiersTime, type Mode } from './availability'
import { bookableModes, freeSlots, getPractitioner, searchPractitioners } from './booking'
import { SPECIALTIES, specialtyLabel } from './specialties'

const chercherPraticien: ActionDef<{ specialite?: string; wilaya?: string; texte?: string; limite?: number }> = {
  name: 'chercher_praticien',
  title: 'Chercher un praticien',
  description: 'Cherche des praticiens de santé publiés sur DALIL (rendez-vous en ligne) par spécialité et wilaya ; les premiers disponibles d’abord, avec leur prochain créneau libre.',
  module: 'sante',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      specialite: { type: 'string', enum: SPECIALTIES.map((s) => s.value), description: 'Spécialité (valeur du référentiel DALIL).' },
      wilaya: S.wilaya,
      texte: S.texte('Nom, ville ou cabinet.', 120),
      limite: S.limite,
    },
  },
  async run(input, ctx) {
    const wilaya = input.wilaya ? wilayaCode(input.wilaya) : undefined
    if (input.wilaya && !wilaya) return { total: 0, resultats: [], message: `Wilaya inconnue : ${input.wilaya}.` }
    const cards = await searchPractitioners({ specialty: input.specialite, wilaya: wilaya ?? undefined, text: input.texte })
    return {
      total: cards.length,
      resultats: cards.slice(0, limitOf(input.limite)).map((c) => ({
        titre: c.name,
        specialites: c.specialties.map(specialtyLabel),
        adresse: c.address,
        ville: c.city,
        wilaya: wilayaLabel(c.wilaya),
        modes: c.modes,
        tarif: c.fee,
        identite_verifiee: c.verified,
        exemple: c.demo,
        prochain_creneau: c.next,
        url: absoluteUrl(`/praticiens/${c.slug}`, ctx.lang),
      })),
    }
  },
}

const fiche = (p: Practitioner, lang: 'fr' | 'en' | 'ar') => ({
  titre: p.name,
  intitule: p.title ?? null,
  specialites: ((p.specialties ?? []) as string[]).map(specialtyLabel),
  presentation: p.bio ?? null,
  langues: p.languages ?? [],
  cabinet: p.cabinetName ?? null,
  adresse: p.address ?? null,
  ville: p.city,
  wilaya: wilayaLabel(p.wilaya),
  modes: bookableModes(p),
  tarif: p.fee ?? null,
  paiement: p.payment ?? null,
  identite_verifiee: Boolean(p.identityVerified),
  exemple: Boolean(p.demo),
  url: absoluteUrl(`/praticiens/${p.slug}`, lang),
})

const voirPraticien: ActionDef<{ slug: string }> = {
  name: 'voir_praticien',
  title: 'Voir un praticien',
  description: 'Fiche publiée d’un praticien (spécialités, cabinet, langues, modes de consultation, tarif), à partir de son slug ou de son adresse https://www.mydalil.com/praticiens/…',
  module: 'sante',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: { slug: S.slug }, required: ['slug'] },
  async run(input, ctx) {
    const p = await getPractitioner(slugFrom(input.slug), ctx.lang)
    return p ? { trouve: true, fiche: fiche(p, ctx.lang) } : { trouve: false, message: 'Aucun praticien publié à ce nom.' }
  },
}

const creneauxPraticien: ActionDef<{ slug: string; date?: string; jours?: number; mode?: Mode }> = {
  name: 'creneaux_praticien',
  title: 'Créneaux libres d’un praticien',
  description: 'Créneaux de rendez-vous encore libres d’un praticien publié (heure d’Alger). Lecture seule : la réservation se fait sur la page du praticien, par la personne elle-même.',
  module: 'sante',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      slug: S.slug,
      date: { type: 'string', maxLength: 10, description: 'Premier jour (AAAA-MM-JJ, heure d’Alger). Défaut : aujourd’hui.' },
      jours: { type: 'integer', minimum: 1, maximum: 14, description: 'Nombre de jours (défaut 7).' },
      mode: { type: 'string', enum: ['cabinet', 'visio'] },
    },
    required: ['slug'],
  },
  async run(input, ctx) {
    const p = await getPractitioner(slugFrom(input.slug))
    if (!p) return { trouve: false, message: 'Aucun praticien publié à ce nom.' }
    if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Date attendue au format AAAA-MM-JJ.')
    const days = await freeSlots(p, input.date ?? algiersDate(new Date()), input.jours ?? 7, input.mode)
    return {
      trouve: true,
      praticien: p.name,
      fuseau: 'Africa/Algiers',
      jours: days.map((d) => ({ date: d.date, creneaux: d.slots.map((s) => ({ debut: s.start, heure: algiersTime(s.start), modes: s.modes })) })),
      reserver: absoluteUrl(`/praticiens/${p.slug}`, ctx.lang),
    }
  },
}

export const actions: ActionDef[] = [chercherPraticien, voirPraticien, creneauxPraticien]
