import type { Payload } from 'payload'
import { THEME_KEYS } from './themes'

/**
 * Import des démarches, services en ligne et postes consulaires collectés (format : /home/claude/research/SCHEMA.md,
 * copie dans data/). Mise à jour par identifiant : relancer l’import ne crée jamais de doublon.
 * Entrée sans source officielle ou sans URL valide : ignorée (règle DALIL : rien sans source).
 */
type Src = { url?: string; titre?: string; consulte?: string }
type Link = { titre?: string; url?: string }
type RawProcedure = { slug?: string; titre?: string; categorie?: string; public?: string[]; resume?: string; en_ligne?: { possible?: boolean; url?: string; plateforme?: string }; etapes?: string[]; pieces?: string[]; cout?: string; delai?: string; ou?: string; formulaires?: Link[]; textes?: Link[]; sources?: Src[] }
type RawPlatform = { slug?: string; nom?: string; url?: string; organisme?: string; services?: string[]; sources?: Src[] }
type RawRep = { pays?: string; ville?: string; type?: string; nom?: string; adresse?: string; telephone?: string; email?: string; site?: string; juridiction?: string; continent?: string; services_en_ligne?: Link[]; sources?: Src[] }
export type OfficialData = { demarches?: RawProcedure[]; plateformes?: RawPlatform[]; representations?: RawRep[] }

const isUrl = (u?: string) => typeof u === 'string' && /^https?:\/\/[^\s]+\.[^\s]+/.test(u)
const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90)
const sources = (xs?: Src[]) => (xs ?? []).filter((s) => isUrl(s.url)).map((s) => ({ url: s.url!, title: (s.titre || s.url!).slice(0, 300), checked: s.consulte || '2026-11-01' }))
const links = (xs?: Link[]) => (xs ?? []).filter((l) => isUrl(l.url)).map((l) => ({ title: (l.titre || l.url!).slice(0, 300), url: l.url! }))
const texts = (xs?: string[]) => (xs ?? []).filter((t) => typeof t === 'string' && t.trim()).map((text) => ({ text: text.trim().slice(0, 500) }))
/** Poste connu seulement par Wikipedia : brouillon interne « à vérifier », jamais affiché au public. */
const onlyWiki = (src: { url: string }[]) => src.every((s) => /wikipedia\.org|wiki\./.test(s.url))
const KINDS: Record<string, 'ambassade' | 'consulat-general' | 'consulat'> = { ambassade: 'ambassade', 'consulat-general': 'consulat-general', consulat: 'consulat' }
const AUD = ['residents', 'diaspora', 'etrangers', 'entreprises']

async function upsert(payload: Payload, collection: 'procedures' | 'platforms' | 'representations', slug: string, data: Record<string, unknown>, firstStatus: 'published' | 'draft' = 'published') {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })
  const doc = found.docs[0] as { id: number; status?: string } | undefined
  // Une fiche retirée ou mise en brouillon par l’équipe garde son statut.
  if (doc) await payload.update({ collection, id: doc.id, overrideAccess: true, data: { ...data, status: doc.status ?? 'published' } as never })
  else await payload.create({ collection, overrideAccess: true, data: { ...data, slug, status: firstStatus } as never })
}

export async function importOfficial(payload: Payload, d: OfficialData) {
  const n = { demarches: 0, plateformes: 0, representations: 0, ignores: 0 }
  for (const p of d.demarches ?? []) {
    const src = sources(p.sources)
    const theme = THEME_KEYS.includes(p.categorie as never) ? p.categorie : null
    if (!p.titre || !p.resume || !theme || !src.length) {
      n.ignores++
      continue
    }
    const online = Boolean(p.en_ligne?.possible && isUrl(p.en_ligne.url))
    await upsert(payload, 'procedures', p.slug ? slugify(p.slug) : slugify(p.titre), {
      title: p.titre.slice(0, 200),
      theme,
      audience: (p.public ?? []).filter((a) => AUD.includes(a)),
      summary: p.resume,
      online,
      onlineUrl: online ? p.en_ligne!.url : null,
      platform: p.en_ligne?.plateforme ?? null,
      steps: texts(p.etapes),
      documents: texts(p.pieces),
      cost: p.cout ?? null,
      delay: p.delai ?? null,
      where: p.ou ?? null,
      forms: links(p.formulaires),
      laws: links(p.textes),
      sources: src,
    })
    n.demarches++
  }
  let order = 1
  for (const p of d.plateformes ?? []) {
    const src = sources(p.sources)
    if (!p.nom || !isUrl(p.url) || !src.length) {
      n.ignores++
      continue
    }
    await upsert(payload, 'platforms', p.slug ? slugify(p.slug) : slugify(p.nom), { name: p.nom, url: p.url, organisme: p.organisme ?? null, services: texts(p.services), sources: src, order: order++ })
    n.plateformes++
  }
  for (const r of d.representations ?? []) {
    const src = sources(r.sources)
    const kind = KINDS[r.type ?? '']
    if (!r.pays || !r.ville || !kind || !src.length) {
      n.ignores++
      continue
    }
    const name = r.nom || `${kind === 'ambassade' ? 'Ambassade' : kind === 'consulat-general' ? 'Consulat général' : 'Consulat'} d’Algérie à ${r.ville}`
    await upsert(payload, 'representations', slugify(`${r.pays}-${r.ville}-${kind}`), {
      name,
      country: r.pays,
      city: r.ville,
      kind,
      continent: r.continent ?? null,
      address: r.adresse ?? null,
      phone: r.telephone ?? null,
      email: r.email ?? null,
      website: isUrl(r.site) ? r.site : null,
      jurisdiction: r.juridiction ?? null,
      onlineServices: links(r.services_en_ligne),
      sources: src,
    }, onlyWiki(src) ? 'draft' : 'published')
    n.representations++
  }
  return n
}
