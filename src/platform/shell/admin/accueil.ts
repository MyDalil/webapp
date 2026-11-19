/**
 * Accueil de l’équipe dans /admin : ce qui attend une action, en mots simples (logique pure, testée).
 * Une case = un comptage léger (`payload.count`) et un lien vers la liste déjà filtrée.
 */
export type Where = Record<string, unknown>
export type Tache = { key: string; collection: string; label: string; where: Where }

export const STAFF_ROLES = ['patron', 'admin', 'editor'] as const
export const isTeam = (u: unknown) => {
  const x = u as { collection?: string; role?: string } | null | undefined
  return x?.collection === 'users' && (STAFF_ROLES as readonly string[]).includes(String(x.role))
}

/** « À relire » : brouillons ou fiches en attente, par collection. */
export const A_RELIRE: Tache[] = [
  { key: 'places', collection: 'places', label: 'Adresses', where: { _status: { equals: 'draft' } } },
  { key: 'practitioners', collection: 'practitioners', label: 'Praticiens', where: { status: { equals: 'pending' } } },
  { key: 'providers', collection: 'providers', label: 'Prestataires', where: { status: { equals: 'pending' } } },
  { key: 'classifieds', collection: 'classifieds', label: 'Annonces', where: { status: { equals: 'pending' } } },
  { key: 'procedures', collection: 'procedures', label: 'Démarches', where: { status: { equals: 'draft' } } },
]

export const CASES: Tache[] = [
  { key: 'submissions', collection: 'submissions', label: 'Contributions', where: { status: { in: ['new', 'processing', 'needs_info'] } } },
  { key: 'media', collection: 'media', label: 'Photos à contrôler', where: { moderation: { equals: 'to-check' } } },
  { key: 'sponsorships', collection: 'sponsorships', label: 'Demandes de mise en avant', where: { status: { equals: 'demande' } } },
  { key: 'claims', collection: 'claims', label: 'Revendications', where: { status: { equals: 'en_attente' } } },
  { key: 'subscriptions', collection: 'subscriptions', label: 'Abonnements à activer', where: { status: { equals: 'en_attente' } } },
]

/** Objet `where` Payload → paramètres d’adresse lus par la liste de l’admin (`where[status][in][0]=new`). */
export function whereParams(where: Where, prefix = 'where'): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(where)) {
    const key = `${prefix}[${k}]`
    if (Array.isArray(v)) v.forEach((x, i) => out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`))
    else if (v && typeof v === 'object') out.push(...whereParams(v as Where, key))
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
  }
  return out
}

/** Lien vers la liste filtrée d’une collection dans /admin. */
export const listHref = (t: Pick<Tache, 'collection' | 'where'>) => `/admin/collections/${t.collection}?${whereParams(t.where).join('&')}`

/** Nombre affiché : « — » si le comptage a échoué (collection absente, panne), jamais une valeur inventée. */
export const shown = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '—')

/** Lignes simples du rapport de contrôle de sécurité (`securityReport`) : libellé, valeur, alerte. */
export type Ligne = { label: string; valeur: string; alerte: boolean; exemples?: string[] }
type Sample = { total?: number; exemples?: { id: number | string; name: string; city?: string | null }[]; erreur?: string }
const num = (x: unknown): number | null => (typeof x === 'number' ? x : null)
const err = (x: unknown) => (x && typeof x === 'object' && 'erreur' in x ? String((x as { erreur: unknown }).erreur) : null)

export function controleLignes(r: Record<string, unknown>): Ligne[] {
  const fiches = (r.fiches ?? {}) as Record<string, unknown>
  const medias = (r.medias ?? {}) as Record<string, unknown>
  const sample = (label: string, s: unknown): Ligne => {
    const e = err(s)
    if (e) return { label, valeur: `Contrôle impossible (${e})`, alerte: true }
    const x = (s ?? {}) as Sample
    const n = x.total ?? 0
    return { label, valeur: String(n), alerte: n > 0, exemples: (x.exemples ?? []).map((d) => `${d.name}${d.city ? ` — ${d.city}` : ''} (#${d.id})`) }
  }
  const count = (label: string, v: unknown): Ligne => {
    const e = err(v)
    if (e) return { label, valeur: `Contrôle impossible (${e})`, alerte: true }
    const n = num(v) ?? 0
    return { label, valeur: String(n), alerte: n > 0 }
  }
  const out: Ligne[] = [
    sample('Adresses publiées sans téléphone', fiches.sansTelephone),
    sample('Adresses publiées sans adresse', fiches.sansAdresse),
    sample('Adresses publiées sans position sur la carte', fiches.sansCoordonnees),
  ]
  const d = fiches.doublons as { examines?: number; paires?: { a: { id: unknown; name: string }; b: { id: unknown; name: string }; raison: string; distanceM?: number }[] } | undefined
  if (err(d)) out.push({ label: 'Doublons probables', valeur: `Contrôle impossible (${err(d)})`, alerte: true })
  else {
    const p = d?.paires ?? []
    out.push({ label: 'Doublons probables', valeur: `${p.length} sur ${d?.examines ?? 0} adresses`, alerte: p.length > 0, exemples: p.slice(0, 10).map((x) => `${x.a.name} (#${x.a.id}) ↔ ${x.b.name} (#${x.b.id}) — ${x.raison}${x.distanceM != null ? `, ${x.distanceM} m` : ''}`) })
  }
  out.push(count('Photos sans texte alternatif', medias.photosSansTexteAlternatif), count('Photos à contrôler', medias.aControler))
  const er = r.erreursRecentes7j as { total?: number; dernieres?: { message: string; occurrences: number }[] } | undefined
  if (err(er)) out.push({ label: 'Erreurs du site (7 jours)', valeur: `Contrôle impossible (${err(er)})`, alerte: true })
  else out.push({ label: 'Erreurs du site (7 jours)', valeur: String(er?.total ?? 0), alerte: (er?.total ?? 0) > 0, exemples: (er?.dernieres ?? []).map((x) => `${x.message} (${x.occurrences}×)`) })
  const s = r.sauvegarde as { ilYaHeures?: number | null; enRetard?: boolean; derniereErreur?: string | null } | undefined
  if (err(s)) out.push({ label: 'Dernière sauvegarde', valeur: `Contrôle impossible (${err(s)})`, alerte: true })
  else out.push({ label: 'Dernière sauvegarde', valeur: s?.ilYaHeures != null ? `il y a ${s.ilYaHeures} h` : 'aucune sauvegarde réussie', alerte: s?.enRetard !== false, exemples: s?.derniereErreur ? [`Dernière erreur : ${s.derniereErreur}`] : undefined })
  const absentes = Array.isArray(r.variablesAbsentes) ? (r.variablesAbsentes as string[]) : []
  out.push({ label: 'Réglages manquants sur Vercel', valeur: absentes.length ? absentes.join(', ') : 'aucun', alerte: absentes.length > 0 })
  out.push({ label: 'Clés d’accès IA (MCP) déclarées', valeur: String(num(r.clesMcpDeclarees) ?? 0), alerte: false })
  const eq = r.equipe
  if (err(eq)) out.push({ label: 'Comptes de l’équipe', valeur: `Contrôle impossible (${err(eq)})`, alerte: true })
  else {
    const list = Array.isArray(eq) ? (eq as { nom: string; role: string }[]) : []
    out.push({ label: 'Comptes de l’équipe', valeur: String(list.length), alerte: false, exemples: list.map((u) => `${u.nom || 'Sans nom'} — ${u.role}`) })
  }
  return out
}
