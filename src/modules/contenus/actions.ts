import 'server-only'
import type { Procedure, Representation } from '@/payload-types'
import type { ActionDef } from '@/platform/actions/types'
import { S, absoluteUrl, limitOf, matchesWords, slugFrom } from '@/platform/actions'
import { listProcedures, listRepresentations, procedureBySlug } from './officiel/queries'
import { THEMES, themeByKey } from './officiel/themes'

const KIND: Record<string, string> = { ambassade: 'Ambassade', 'consulat-general': 'Consulat général', consulat: 'Consulat' }

const chercherDemarche: ActionDef<{ texte?: string; theme?: string; limite?: number }> = {
  name: 'chercher_demarche',
  title: 'Chercher une démarche officielle',
  description: 'Cherche les démarches administratives algériennes publiées sur DALIL (passeport, CNI, état civil, casier, diaspora…), avec leurs sources officielles.',
  module: 'contenus',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      texte: S.texte('Mots-clés, ex. « passeport », « acte de naissance ».', 120),
      theme: { type: 'string', enum: THEMES.map((t) => t.key), description: 'Thème des démarches.' },
      limite: S.limite,
    },
  },
  async run(input, ctx) {
    const all = await listProcedures(input.theme)
    const found = all.filter((d) => matchesWords([d.title, d.summary, d.platform, themeByKey(d.theme)?.label].filter(Boolean).join(' '), input.texte))
    return {
      total: found.length,
      resultats: found.slice(0, limitOf(input.limite)).map((d) => ({
        titre: d.title,
        theme: themeByKey(d.theme)?.label ?? d.theme,
        resume: d.summary,
        en_ligne: Boolean(d.online),
        url: absoluteUrl(`/demarches/${d.slug}`, ctx.lang),
      })),
    }
  },
}

const fiche = (d: Procedure, lang: 'fr' | 'en' | 'ar') => ({
  titre: d.title,
  theme: themeByKey(d.theme)?.label ?? d.theme,
  public: d.audience ?? [],
  resume: d.summary,
  en_ligne: Boolean(d.online),
  service_en_ligne: d.onlineUrl ?? null,
  plateforme: d.platform ?? null,
  etapes: d.steps ?? [],
  pieces: d.documents ?? [],
  cout: d.cost ?? null,
  delai: d.delay ?? null,
  ou: d.where ?? null,
  formulaires: d.forms ?? [],
  textes: d.laws ?? [],
  sources: d.sources ?? [],
  mise_a_jour: d.updatedAt,
  url: absoluteUrl(`/demarches/${d.slug}`, lang),
})

const voirDemarche: ActionDef<{ slug: string }> = {
  name: 'voir_demarche',
  title: 'Voir une démarche',
  description: 'Détail d’une démarche publiée : étapes, pièces, coût, délai, lieu, formulaires, textes et sources officielles. Citer les sources et l’adresse DALIL.',
  module: 'contenus',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: { slug: S.slug }, required: ['slug'] },
  async run(input, ctx) {
    const d = await procedureBySlug(slugFrom(input.slug), ctx.lang)
    return d ? { trouve: true, demarche: fiche(d, ctx.lang) } : { trouve: false, message: 'Aucune démarche publiée à ce nom.' }
  },
}

const consulat = (r: Representation, lang: 'fr' | 'en' | 'ar') => ({
  titre: r.name,
  type: KIND[r.kind] ?? r.kind,
  pays: r.country,
  ville: r.city,
  adresse: r.address ?? null,
  telephone: r.phone ?? null,
  site: r.website ?? null,
  circonscription: r.jurisdiction ?? null,
  services_en_ligne: r.onlineServices ?? [],
  sources: r.sources ?? [],
  url: absoluteUrl(`/demarches/consulats#${r.slug}`, lang),
})

const chercherConsulat: ActionDef<{ pays?: string; ville?: string; texte?: string; limite?: number }> = {
  name: 'chercher_consulat',
  title: 'Chercher une ambassade ou un consulat d’Algérie',
  description: 'Ambassades et consulats d’Algérie à l’étranger publiés sur DALIL, par pays, ville ou circonscription.',
  module: 'contenus',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: { pays: S.texte('Pays, ex. « France ».', 80), ville: S.texte('Ville, ex. « Lyon ».', 80), texte: S.texte('Mot-clé (circonscription, département…).', 120), limite: S.limite } },
  async run(input, ctx) {
    const all = await listRepresentations()
    const found = all.filter((r) => matchesWords(r.country, input.pays) && matchesWords(r.city, input.ville) && matchesWords([r.name, r.country, r.city, r.jurisdiction].filter(Boolean).join(' '), input.texte))
    return { total: found.length, resultats: found.slice(0, limitOf(input.limite)).map((r) => consulat(r, ctx.lang)) }
  },
}

export const actions: ActionDef[] = [chercherDemarche, voirDemarche, chercherConsulat]
