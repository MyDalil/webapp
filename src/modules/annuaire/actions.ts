import 'server-only'
import type { Place } from '@/payload-types'
import type { ActionDef } from '@/platform/actions/types'
import { S, absoluteUrl, limitOf, slugFrom, wilayaCode, wilayaLabel } from '@/platform/actions'
import { payloadFor } from '@/platform/actions/payload'
import { SECTORS } from '@/platform/referentiel/catalog'
import { offSet } from '@/platform/controls/offSections'
import { offKeyForPlace } from '@/platform/controls/sections'
import { getPublishedPlace, searchPlaces as searchAll, type PlaceCard } from './queries'

/** Recherche des actions : sans les fiches d’une rubrique ou catégorie coupée (/admin/rubriques). */
async function searchPlaces(...a: Parameters<typeof searchAll>) {
  const [res, off] = await Promise.all([searchAll(...a), offSet()])
  if (!off.size) return res
  const places = res.places.filter((p) => !offKeyForPlace(p.sector, p.category, off))
  return { places, total: res.total - (res.places.length - places.length) }
}

/** Seuls les statuts positifs sortent : « À vérifier » est réservé à l’équipe (règle 3, décision de Rad). */
const STATUS: Record<string, string> = { verified: 'Vérifiée', labelled: 'Label Excellence' }
const EDU = 'education-formation'
/** Niveaux d’école → catégories du référentiel (mêmes libellés que schoolCategory.ts). */
const NIVEAUX: Record<string, { sector: string; category: string }> = {
  creche: { sector: EDU, category: 'Crèches' },
  primaire: { sector: EDU, category: 'Écoles primaires' },
  college: { sector: EDU, category: 'Collèges' },
  lycee: { sector: EDU, category: 'Lycées' },
  universite: { sector: EDU, category: 'Universités' },
  formation: { sector: EDU, category: 'Formation professionnelle' },
  langues: { sector: EDU, category: 'Écoles de langues' },
  'auto-ecole': { sector: EDU, category: 'Auto-écoles' },
  coranique: { sector: 'mosquees-priere', category: 'Écoles coraniques' },
}

const card = (p: PlaceCard, lang: 'fr' | 'en' | 'ar') => ({
  titre: p.name,
  categorie: p.category,
  secteur: p.sectorTitle,
  quartier: p.place || null,
  ville: p.city,
  wilaya: wilayaLabel(p.wilaya),
  statut: STATUS[p.status] ?? null,
  coup_de_coeur: p.favorite,
  url: absoluteUrl(`/adresses/${p.slug}`, lang),
})

const chercherLieu: ActionDef<{ categorie?: string; secteur?: string; wilaya?: string; texte?: string; limite?: number }> = {
  name: 'chercher_lieu',
  title: 'Chercher une adresse',
  description: 'Cherche des adresses publiées dans l’annuaire DALIL (restaurants, hôtels, mosquées, pharmacies, écoles…) par catégorie, secteur, wilaya et texte. Les valeurs exactes de catégorie et de secteur sont données par lister_rubriques.',
  module: 'annuaire',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      categorie: S.texte('Catégorie exacte, ex. « Restaurants », « Pharmacies ».', 80),
      secteur: { type: 'string', enum: SECTORS.map((s) => s.slug), description: 'Secteur de l’annuaire.' },
      wilaya: S.wilaya,
      texte: S.texte('Nom, ville, quartier ou mot-clé.', 120),
      limite: S.limite,
    },
  },
  async run(input, ctx) {
    const wilaya = input.wilaya ? wilayaCode(input.wilaya) : undefined
    if (input.wilaya && !wilaya) return { total: 0, resultats: [], message: `Wilaya inconnue : ${input.wilaya}.` }
    const { places, total } = await searchPlaces({ sector: input.secteur, category: input.categorie, wilaya: wilaya ?? undefined, q: input.texte }, limitOf(input.limite))
    return { total, resultats: places.map((p) => card(p, ctx.lang)) }
  },
}

const chercherEcole: ActionDef<{ niveau?: string; wilaya?: string; texte?: string; limite?: number }> = {
  name: 'chercher_ecole',
  title: 'Chercher une école',
  description: 'Cherche des établissements d’enseignement publiés dans l’annuaire DALIL : crèche, primaire, collège, lycée, université, formation professionnelle, école de langues, auto-école, école coranique.',
  module: 'annuaire',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      niveau: { type: 'string', enum: Object.keys(NIVEAUX), description: 'Niveau ou type d’établissement.' },
      wilaya: S.wilaya,
      texte: S.texte('Nom, ville ou quartier.', 120),
      limite: S.limite,
    },
  },
  async run(input, ctx) {
    const wilaya = input.wilaya ? wilayaCode(input.wilaya) : undefined
    if (input.wilaya && !wilaya) return { total: 0, resultats: [], message: `Wilaya inconnue : ${input.wilaya}.` }
    const target = input.niveau ? NIVEAUX[input.niveau] : { sector: EDU, category: undefined }
    const { places, total } = await searchPlaces({ sector: target.sector, category: target.category, wilaya: wilaya ?? undefined, q: input.texte }, limitOf(input.limite))
    return { total, resultats: places.map((p) => card(p, ctx.lang)) }
  },
}

/** Fiche publiée, champs publics seulement (jamais d’email, de note interne ni de source privée). */
function fiche(p: Place, lang: 'fr' | 'en' | 'ar') {
  return {
    titre: p.name,
    nom_arabe: p.nameAr ?? null,
    nom_anglais: p.nameEn ?? null,
    categorie: p.category,
    secteur: SECTORS.find((s) => s.slug === p.sector)?.title ?? p.sector,
    presentation: p.intro ?? null,
    adresse: p.address ?? null,
    quartier: p.place ?? null,
    ville: p.city,
    wilaya: wilayaLabel(p.wilaya),
    position: typeof p.lat === 'number' && typeof p.lng === 'number' ? { lat: p.lat, lng: p.lng } : null,
    telephone: p.phone ?? null,
    whatsapp: p.whatsapp ?? null,
    site: p.website ?? null,
    instagram: p.instagram ?? null,
    facebook: p.facebook ?? null,
    langues: p.languages ?? [],
    horaires: (p.hours ?? []).map((h) => ({ jours: h.days, heures: h.time })),
    statut: STATUS[p.verification] ?? null,
    verifiee_le: p.verifiedAt ?? null,
    mise_a_jour: p.updatedAt,
    url: absoluteUrl(`/adresses/${p.slug}`, lang),
  }
}

const voirFiche: ActionDef<{ slug: string }> = {
  name: 'voir_fiche',
  title: 'Voir une adresse',
  description: 'Fiche complète d’une adresse publiée de l’annuaire (adresse, horaires, contacts publics, statut de vérification), à partir de son slug ou de son adresse https://www.mydalil.com/adresses/…',
  module: 'annuaire',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: { slug: S.slug }, required: ['slug'] },
  async run(input, ctx) {
    const place = await getPublishedPlace(slugFrom(input.slug), ctx.lang, 0)
    if (!place || offKeyForPlace(place.sector, place.category, await offSet())) return { trouve: false, message: 'Aucune adresse publiée à ce nom.' }
    return { trouve: true, fiche: fiche(place, ctx.lang) }
  },
}

const creerBrouillonLieu: ActionDef<{ nom: string; secteur: string; categorie: string; ville: string; wilaya?: string; quartier?: string; adresse?: string; telephone?: string; site?: string; presentation?: string; source?: string }> = {
  name: 'creer_brouillon_lieu',
  title: 'Créer une adresse en brouillon',
  description: 'Équipe DALIL : crée une nouvelle adresse de l’annuaire en brouillon, statut « À vérifier ». Rien n’est publié : un administrateur relit puis publie depuis /admin.',
  module: 'annuaire',
  access: 'staff',
  readOnly: false,
  input: {
    type: 'object',
    properties: {
      nom: S.texte('Nom de l’établissement.', 160),
      secteur: { type: 'string', enum: SECTORS.map((s) => s.slug), description: 'Secteur de l’annuaire.' },
      categorie: S.texte('Catégorie exacte du secteur (voir lister_rubriques).', 80),
      ville: S.texte('Ville ou commune.', 80),
      wilaya: S.wilaya,
      quartier: S.texte('Quartier.', 80),
      adresse: S.texte('Adresse postale.', 240),
      telephone: S.texte('Téléphone public.', 40),
      site: S.texte('Site web.', 240),
      presentation: S.texte('Deux ou trois phrases factuelles.', 1000),
      source: S.texte('D’où vient l’information (lien, visite, appel). Obligatoire pour la vérification.', 300),
    },
    required: ['nom', 'secteur', 'categorie', 'ville'],
  },
  async run(input, ctx) {
    const sector = SECTORS.find((s) => s.slug === input.secteur)
    if (!sector?.categories.includes(input.categorie)) throw new Error(`Catégorie inconnue pour ce secteur. Choix : ${sector?.categories.join(', ')}.`)
    const wilaya = input.wilaya ? wilayaCode(input.wilaya) : null
    if (input.wilaya && !wilaya) throw new Error(`Wilaya inconnue : ${input.wilaya}.`)
    const { payload, opts } = await payloadFor(ctx)
    const doc = await payload.create({
      collection: 'places',
      draft: true,
      data: {
        name: input.nom,
        sector: input.secteur as Place['sector'],
        category: input.categorie,
        city: input.ville,
        wilaya: (wilaya ?? undefined) as Place['wilaya'],
        place: input.quartier,
        address: input.adresse,
        phone: input.telephone,
        website: input.site,
        intro: input.presentation,
        verification: 'spotted',
        internalNote: input.source ? `Source : ${input.source}` : undefined,
        _status: 'draft',
      },
      ...opts,
    })
    return { summary: `Brouillon créé : ${doc.name} (n° ${doc.id})`, collection: 'places', id: doc.id, statut: 'brouillon', admin: absoluteUrl(`/admin/collections/places/${doc.id}`) }
  },
}

/** Collections qu’un administrateur publie ou refuse ; champ de statut et chemin public. */
const COLLECTIONS = {
  places: { field: '_status', publish: 'published', reject: 'draft', note: 'internalNote', path: (d: Record<string, unknown>) => `/adresses/${d.slug}` },
  practitioners: { field: 'status', publish: 'published', reject: 'suspended', note: 'internalNote', path: (d: Record<string, unknown>) => `/praticiens/${d.slug}` },
  providers: { field: 'status', publish: 'published', reject: 'suspended', note: 'internalNote', path: (d: Record<string, unknown>) => `/prestataires/${d.slug}` },
  classifieds: { field: 'status', publish: 'published', reject: 'rejected', note: null, path: (d: Record<string, unknown>) => `/annonces/${d.category}/${d.slug}` },
  procedures: { field: 'status', publish: 'published', reject: 'draft', note: null, path: (d: Record<string, unknown>) => `/demarches/${d.slug}` },
  representations: { field: 'status', publish: 'published', reject: 'draft', note: null, path: (d: Record<string, unknown>) => `/demarches/consulats#${d.slug}` },
} as const
type Coll = keyof typeof COLLECTIONS
const collectionInput = { type: 'string', enum: Object.keys(COLLECTIONS), description: 'places (adresses), practitioners, providers, classifieds (annonces), procedures (démarches), representations (consulats).' }

const publierFiche: ActionDef<{ collection: Coll; id: number }> = {
  name: 'publier_fiche',
  title: 'Publier une fiche',
  description: 'Administrateur (patron ou admin) seulement : publie une fiche relue (adresse, praticien, prestataire, annonce, démarche, consulat).',
  module: 'annuaire',
  access: 'admin',
  readOnly: false,
  input: { type: 'object', properties: { collection: collectionInput, id: { type: 'integer', minimum: 1 } }, required: ['collection', 'id'] },
  async run(input, ctx) {
    const c = COLLECTIONS[input.collection]
    const { payload, opts } = await payloadFor(ctx)
    const doc = (await payload.update({ collection: input.collection, id: input.id, data: { [c.field]: c.publish }, ...opts })) as unknown as Record<string, unknown>
    return { summary: `Publié : ${input.collection} n° ${input.id}`, collection: input.collection, id: input.id, statut: c.publish, url: absoluteUrl(c.path(doc), ctx.lang) }
  },
}

const rejeterFiche: ActionDef<{ collection: Coll; id: number; motif: string }> = {
  name: 'rejeter_fiche',
  title: 'Refuser une fiche',
  description: 'Administrateur (patron ou admin) seulement : refuse une fiche avec un motif (annonce refusée, adresse remise en brouillon, praticien ou prestataire suspendu, démarche ou consulat retiré en brouillon).',
  module: 'annuaire',
  access: 'admin',
  readOnly: false,
  input: { type: 'object', properties: { collection: collectionInput, id: { type: 'integer', minimum: 1 }, motif: S.texte('Motif du refus (envoyé à l’auteur pour une annonce).', 500) }, required: ['collection', 'id', 'motif'] },
  async run(input, ctx) {
    const c = COLLECTIONS[input.collection]
    const { payload, opts } = await payloadFor(ctx)
    const data: Record<string, unknown> = { [c.field]: c.reject }
    if (input.collection === 'classifieds') data.rejectionReason = input.motif
    if (c.note) {
      const before = (await payload.findByID({ collection: input.collection, id: input.id, depth: 0, ...opts })) as unknown as Record<string, unknown>
      const prev = typeof before[c.note] === 'string' ? `${before[c.note]}\n` : ''
      data[c.note] = `${prev}Refus du ${new Date().toISOString().slice(0, 10)} : ${input.motif}`
    }
    await payload.update({ collection: input.collection, id: input.id, data, ...opts })
    return { summary: `Refusé : ${input.collection} n° ${input.id} — ${input.motif}`, collection: input.collection, id: input.id, statut: c.reject }
  },
}

/** Champs qu’une correction peut modifier : textes simples, jamais le statut, le lien, la vérification ni les notes internes. */
const LOCKED = new Set(['_status', 'status', 'slug', 'verification', 'verifiedAt', 'internalNote', 'owner', 'member', 'createdAt', 'updatedAt', 'id'])
const EDITABLE_TYPES = new Set(['text', 'textarea', 'email', 'number'])

const modifierBrouillon: ActionDef<{ collection: Coll; id: number; champs: Record<string, unknown> }> = {
  name: 'modifier_brouillon',
  title: 'Corriger un brouillon',
  description: 'Équipe : corrige des champs texte d’une fiche (nom, adresse, téléphone, site, présentation…). Une adresse publiée reçoit un nouveau brouillon à relire ; une autre fiche publiée n’est pas modifiable par ce canal (passer par /admin).',
  module: 'annuaire',
  access: 'staff',
  readOnly: false,
  input: { type: 'object', properties: { collection: collectionInput, id: { type: 'integer', minimum: 1 }, champs: { type: 'object', description: 'Champs à corriger : { nomDuChamp: nouvelleValeur }' } }, required: ['collection', 'id', 'champs'] },
  async run(input, ctx) {
    const c = COLLECTIONS[input.collection]
    const { payload, opts } = await payloadFor(ctx)
    const fields = (payload.collections[input.collection]?.config.flattenedFields ?? []) as { name?: string; type?: string }[]
    const allowed = new Set(fields.filter((f) => f.name && f.type && EDITABLE_TYPES.has(f.type) && !LOCKED.has(f.name)).map((f) => f.name as string))
    const data = Object.fromEntries(Object.entries(input.champs ?? {}).filter(([k, v]) => allowed.has(k) && (typeof v === 'string' || typeof v === 'number')))
    const ignored = Object.keys(input.champs ?? {}).filter((k) => !(k in data))
    if (!Object.keys(data).length) return { summary: 'Aucun champ corrigeable.', ignores: ignored, champsPossibles: [...allowed] }
    if (c.field === '_status') {
      await payload.update({ collection: input.collection, id: input.id, draft: true, data, ...opts })
    } else {
      const current = (await payload.findByID({ collection: input.collection, id: input.id, depth: 0, ...opts })) as unknown as Record<string, unknown>
      if (current[c.field] === c.publish) return { summary: 'Fiche publiée : corrigez-la dans /admin.', admin: absoluteUrl(`/admin/collections/${input.collection}/${input.id}`) }
      await payload.update({ collection: input.collection, id: input.id, data, ...opts })
    }
    return { summary: `Corrigé : ${input.collection} n° ${input.id} (${Object.keys(data).join(', ')})`, collection: input.collection, id: input.id, statut: 'brouillon', ignores: ignored, admin: absoluteUrl(`/admin/collections/${input.collection}/${input.id}`) }
  },
}

export const actions: ActionDef[] = [chercherLieu, chercherEcole, voirFiche, creerBrouillonLieu, modifierBrouillon, publierFiche, rejeterFiche]
