import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { S, absoluteUrl, limitOf, slugFrom, wilayaCode, wilayaLabel } from '@/platform/actions'
import { CATEGORIES, activityLabel, categoryLabel } from './activities'
import { getProvider, searchProviders, toCard, type ProviderCard } from './marketplace'

const out = (c: ProviderCard, lang: 'fr' | 'en' | 'ar') => ({
  titre: c.name,
  categories: c.categories.map(categoryLabel),
  prestations: c.offers.map((o) => ({ activite: o.label, prix: o.priceLabel })),
  commune: c.baseCommune,
  wilaya: wilayaLabel(c.wilaya),
  langues: c.languages,
  clientele: c.clientele,
  note: c.rating,
  avis: c.reviews,
  missions: c.missionsDone,
  experience_ans: c.experienceYears,
  verifications: { identite: c.checks.identity, statut_legal: c.checks.legal, casier: c.checks.background },
  exemple: c.demo,
  url: absoluteUrl(`/prestataires/${c.slug}`, lang),
})

const chercherPrestataire: ActionDef<{ categorie?: string; activite?: string; wilaya?: string; texte?: string; limite?: number }> = {
  name: 'chercher_prestataire',
  title: 'Chercher un prestataire à domicile',
  description: 'Cherche des prestataires de services à domicile publiés sur DALIL (ménage, bricolage, cours, garde…) par catégorie, activité et wilaya. La demande de mission se fait sur la page du prestataire.',
  module: 'services',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      categorie: { type: 'string', enum: CATEGORIES.map((c) => c.value), description: 'Catégorie de services.' },
      activite: S.texte('Activité précise (valeur du référentiel).', 60),
      wilaya: S.wilaya,
      texte: S.texte('Nom ou mot-clé.', 120),
      limite: S.limite,
    },
  },
  async run(input, ctx) {
    const wilaya = input.wilaya ? wilayaCode(input.wilaya) : undefined
    if (input.wilaya && !wilaya) return { total: 0, resultats: [], message: `Wilaya inconnue : ${input.wilaya}.` }
    const cards = await searchProviders({ category: input.categorie, activity: input.activite, wilaya: wilaya ?? undefined, text: input.texte })
    return { total: cards.length, resultats: cards.slice(0, limitOf(input.limite)).map((c) => out(c, ctx.lang)) }
  },
}

const voirPrestataire: ActionDef<{ slug: string }> = {
  name: 'voir_prestataire',
  title: 'Voir un prestataire',
  description: 'Fiche publiée d’un prestataire à domicile (prestations et prix, zone, vérifications, avis), à partir de son slug ou de son adresse https://www.mydalil.com/prestataires/…',
  module: 'services',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: { slug: S.slug }, required: ['slug'] },
  async run(input, ctx) {
    const p = await getProvider(slugFrom(input.slug), ctx.lang)
    if (!p) return { trouve: false, message: 'Aucun prestataire publié à ce nom.' }
    return { trouve: true, fiche: { ...out(toCard(p), ctx.lang), presentation: p.bio ?? null, activites: ((p.activities ?? []) as string[]).map(activityLabel), paiement: p.payment ?? null } }
  },
}

export const actions: ActionDef[] = [chercherPrestataire, voirPrestataire]
