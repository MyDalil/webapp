import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { S, absoluteUrl, limitOf } from '@/platform/actions'
import { payloadFor } from '@/platform/actions/payload'
import { SECTORS } from '@/platform/referentiel/catalog'
import { searchEverything, type SearchGroup } from './results'

/** Rubrique demandée → groupe de résultats de searchEverything. */
const RUBRIQUES: Record<string, SearchGroup['key']> = {
  adresses: 'adresse',
  praticiens: 'praticien',
  prestataires: 'prestataire',
  annonces: 'annonce',
  demarches: 'demarche',
  consulats: 'consulat',
  guides: 'guide',
  rubriques: 'pistes',
}

const rechercher: ActionDef<{ texte: string; ville?: string; wilaya?: string; rubrique?: string; limite?: number }> = {
  name: 'rechercher',
  title: 'Rechercher dans DALIL',
  description:
    'Recherche dans tout DALIL (guide de l’Algérie) : adresses de l’annuaire, praticiens de santé, prestataires à domicile, annonces, démarches officielles, consulats, guides. Texte libre en français (accents et fautes tolérés). Préciser la ville ou la wilaya améliore le classement. Renvoie des liens https://www.mydalil.com à citer.',
  module: 'recherche',
  access: 'public',
  readOnly: true,
  input: {
    type: 'object',
    properties: {
      texte: S.texte('Ce que la personne cherche, ex. « pédiatre », « pizzeria », « passeport biométrique ».'),
      ville: S.texte('Ville, commune ou quartier (facultatif).', 80),
      wilaya: S.wilaya,
      rubrique: { type: 'string', enum: Object.keys(RUBRIQUES), description: 'Limiter à une rubrique (facultatif).' },
      limite: S.limite,
    },
    required: ['texte'],
  },
  async run(input, ctx) {
    const q = [input.texte, input.ville, input.wilaya].filter(Boolean).join(' ')
    const res = await searchEverything(q)
    const key = input.rubrique ? RUBRIQUES[input.rubrique] : null
    const hits = res.groups.filter((g) => !key || g.key === key).flatMap((g) => g.hits.map((h) => ({ h, groupe: g.title })))
    const shown = hits.slice(0, limitOf(input.limite))
    // Adresses : adresse et téléphone, seulement si la fiche les rend publics (règle `contactField` appliquée par Payload).
    const placeIds = shown.filter((x) => x.h.type === 'adresse').map((x) => Number(x.h.id)).filter(Number.isFinite)
    const contacts = new Map<string, { address?: string | null; phone?: string | null; city?: string | null }>()
    if (placeIds.length) {
      try {
        const { payload, opts } = await payloadFor(ctx)
        const { docs } = await payload.find({ collection: 'places', where: { and: [{ id: { in: placeIds } }, { _status: { equals: 'published' } }] }, depth: 0, limit: placeIds.length, select: { address: true, phone: true, city: true }, ...opts })
        for (const d of docs) contacts.set(String(d.id), { address: d.address, phone: d.phone, city: d.city })
      } catch {
        /* coordonnées absentes : les résultats restent utiles */
      }
    }
    return {
      requete: q,
      lieu: res.place,
      total: res.total,
      indisponible: res.unavailable,
      page_conseillee: absoluteUrl(res.intent.url, ctx.lang),
      resultats: shown.map(({ h, groupe }) => {
        const c = contacts.get(h.id)
        return {
          titre: h.title,
          type: h.type,
          groupe,
          detail: h.subtitle ?? null,
          ...(c ? { adresse: c.address ?? null, ville: c.city ?? null, telephone: c.phone ?? null } : {}),
          badge: h.badge ?? null,
          // Plan payant : « Partenaire », jamais « Vérifié » ; le groupe « Sponsorisé » reste à part (2 au plus).
          ...('partenaire' in h && h.partenaire ? { partenaire: true, libelle_partenaire: 'Partenaire' } : {}),
          url: absoluteUrl(h.url, ctx.lang),
        }
      }),
    }
  },
}

const listerRubriques: ActionDef<Record<string, never>> = {
  name: 'lister_rubriques',
  title: 'Lister les rubriques',
  description: 'Liste les rubriques de DALIL et les catégories de l’annuaire (valeurs exactes à réutiliser dans chercher_lieu), avec leurs pages.',
  module: 'recherche',
  access: 'public',
  readOnly: true,
  input: { type: 'object', properties: {} },
  async run(_input, ctx) {
    return {
      rubriques: [
        { titre: 'Santé : prendre rendez-vous', outil: 'chercher_praticien', url: absoluteUrl('/praticiens', ctx.lang) },
        { titre: 'Services à domicile', outil: 'chercher_prestataire', url: absoluteUrl('/services', ctx.lang) },
        { titre: 'Annonces', outil: 'chercher_annonce', url: absoluteUrl('/annonces', ctx.lang) },
        { titre: 'Démarches officielles', outil: 'chercher_demarche', url: absoluteUrl('/demarches', ctx.lang) },
        { titre: 'Ambassades et consulats', outil: 'chercher_consulat', url: absoluteUrl('/demarches/consulats', ctx.lang) },
      ],
      annuaire: SECTORS.map((s) => ({ secteur: s.slug, titre: s.title, description: s.description, categories: s.categories, url: absoluteUrl(`/annuaire/${s.slug}`, ctx.lang) })),
    }
  },
}

export const actions: ActionDef[] = [rechercher, listerRubriques]
