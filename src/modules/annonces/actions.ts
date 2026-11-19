import 'server-only'
import type { Where } from 'payload'
import type { Classified } from '@/payload-types'
import type { ActionDef } from '@/platform/actions/types'
import { S, absoluteUrl, limitOf, slugFrom, wilayaCode, wilayaLabel } from '@/platform/actions'
import { payloadFor } from '@/platform/actions/payload'
import { communeName } from '@/platform/referentiel/communes'
import { getPublicClassified, type PublicClassified } from './market'
import { CATEGORIES, categoryLabel, dealLabel, facts, priceLabel, subLabel } from './referentiel'

/** En ligne = publiée et non expirée (même règle que l’index de recherche). */
const online = (now: string): Where[] => [{ status: { equals: 'published' } }, { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: now } }] }]

const card = (c: PublicClassified, lang: 'fr' | 'en' | 'ar') => {
  const [cat, sub] = String(c.subcategory ?? '').split(':')
  return {
    titre: c.title,
    categorie: categoryLabel(c.category),
    type: subLabel(cat, sub) ?? null,
    offre: dealLabel(c.deal) ?? null,
    prix: priceLabel({ category: c.category, price: c.price, priceMode: c.priceMode, deal: c.deal }),
    commune: communeName(c.commune),
    wilaya: wilayaLabel(c.wilaya),
    annonceur: c.authorKind === 'pro' ? 'Professionnel' : c.authorKind === 'particulier' ? 'Particulier' : null,
    publiee_le: c.publishedAt ?? null,
    exemple: Boolean(c.example),
    url: absoluteUrl(`/annonces/${c.category}/${c.slug}`, lang),
  }
}

const chercherAnnonce: ActionDef<{ texte?: string; categorie?: string; wilaya?: string; limite?: number }> = {
  name: 'chercher_annonce',
  title: 'Chercher une annonce',
  description: 'Cherche des petites annonces en ligne sur DALIL (immobilier, emploi, véhicules, objets) par mot-clé, catégorie et wilaya. Le contact avec l’annonceur se fait sur la page de l’annonce.',
  module: 'annonces',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      texte: S.texte('Mot-clé (titre ou description).', 120),
      categorie: { type: 'string', enum: CATEGORIES.map((c) => c.value) },
      wilaya: S.wilaya,
      limite: S.limite,
    },
  },
  async run(input, ctx) {
    const wilaya = input.wilaya ? wilayaCode(input.wilaya) : undefined
    if (input.wilaya && !wilaya) return { total: 0, resultats: [], message: `Wilaya inconnue : ${input.wilaya}.` }
    const and = online(new Date().toISOString())
    if (input.categorie) and.push({ category: { equals: input.categorie } })
    if (wilaya) and.push({ wilaya: { equals: wilaya } })
    if (input.texte) and.push({ or: [{ title: { like: input.texte } }, { description: { like: input.texte } }] })
    const { payload, opts } = await payloadFor(ctx)
    const { docs, totalDocs } = await payload.find({ collection: 'classifieds', where: { and }, depth: 0, limit: limitOf(input.limite), sort: '-publishedAt', ...opts })
    return { total: totalDocs, resultats: (docs as Classified[]).map((c) => card(c, ctx.lang)) }
  },
}

const voirAnnonce: ActionDef<{ slug: string }> = {
  name: 'voir_annonce',
  title: 'Voir une annonce',
  description: 'Détail d’une annonce en ligne (description, prix, caractéristiques), à partir de son slug ou de son adresse https://www.mydalil.com/annonces/…',
  module: 'annonces',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: { slug: S.slug }, required: ['slug'] },
  async run(input, ctx) {
    const c = await getPublicClassified(slugFrom(input.slug), ctx.lang)
    if (!c) return { trouve: false, message: 'Aucune annonce en ligne à ce nom.' }
    return { trouve: true, annonce: { ...card(c, ctx.lang), description: c.description, caracteristiques: facts(c), expire_le: c.expiresAt ?? null, contact: 'Par la messagerie de la page de l’annonce.' } }
  },
}

export const actions: ActionDef[] = [chercherAnnonce, voirAnnonce]
