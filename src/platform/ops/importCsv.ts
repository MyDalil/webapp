import 'server-only'
import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { ActionContext } from '@/platform/actions/types'
import { dupKeys, IMPORT_BATCH, MAX_CSV_BYTES, MAX_CSV_LABEL, MAX_CSV_ROWS, parseCsv, planBatch, toPlaces, type CsvPlace, type ImportPlan, type Known } from './csv'
import { requireRole, staffReq, OpsError } from './context'

export type ImportInput = { collection: 'places'; csv: string; wilaya?: string; confirmer?: boolean; depuis?: number }
export type ImportReport = {
  mode: 'simulation' | 'confirme'
  lignes: number
  /** Lot traité : indices des lignes de données [debut, fin) (0 = première ligne après l’en-tête). */
  lot: { debut: number; fin: number; taille: number }
  /** Indice à renvoyer dans `depuis` pour traiter le lot suivant ; null quand le fichier est terminé. */
  suite: number | null
  colonnesIgnorees: string[]
  aCreer: { line: number; name: string; city: string; category: string }[]
  doublons: ImportPlan['duplicates']
  erreurs: ImportPlan['errors']
  crees?: { line: number; id: number | string; name: string }[]
  echecs?: { line: number; erreur: string }[]
}

type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }
export type KnownFinder = (places: CsvPlace[]) => Promise<Known[]>

/** Normalisation SQL alignée sur normKey (minuscules, accents latins retirés, apostrophes retirées, ponctuation → espace). */
const norm = (col: ReturnType<typeof sql>) =>
  sql`btrim(regexp_replace(regexp_replace(translate(lower(coalesce(${col}, '')), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'), '[’''\`]', '', 'g'), '[^a-z0-9؀-ۿ]+', ' ', 'g'))`

/**
 * Fiches existantes susceptibles d’être des doublons du lot (brouillons et corbeille compris), sans charger la table :
 * fin du téléphone (chiffres seuls), nom + commune normalisés, boîte géographique ±0,001°. Le tri fin est fait par DupIndex.
 */
export function sqlKnownFinder(payload: Payload): KnownFinder {
  return async (places) => {
    const { phones, names, boxes } = dupKeys(places)
    if (!phones.length && !names.length && !boxes.length) return []
    const db = (payload.db as unknown as { drizzle: Db }).drizzle
    const { rows } = await db.execute(sql`
      SELECT p.id, p.name, p.city, p.phone, p.lat, p.lng FROM places p
      WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(${JSON.stringify(phones)}::jsonb) t(v)
                    WHERE right(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), length(t.v)) = t.v)
         OR (${norm(sql`p.name`)} || '|' || ${norm(sql`p.city`)}) IN (SELECT jsonb_array_elements_text(${JSON.stringify(names)}::jsonb))
         OR EXISTS (SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(boxes)}::jsonb) AS x(a float8, b float8, c float8, d float8)
                    WHERE p.lat BETWEEN x.a AND x.b AND p.lng BETWEEN x.c AND x.d)
      LIMIT 5000`)
    return rows.map((r) => ({ id: r.id as number, name: String(r.name ?? ''), city: (r.city as string | null) ?? null, phone: (r.phone as string | null) ?? null, lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng) }))
  }
}

/**
 * Import CSV d’adresses, par lots de IMPORT_BATCH lignes (une requête = un lot ; `suite` donne la reprise).
 * Simulation par défaut (rien n’est écrit) ; `confirmer: true` crée les fiches du lot EN BROUILLON, « Repérée — à vérifier »,
 * source DALIL notée. Relance sûre : une fiche déjà créée par un lot précédent est reconnue comme doublon.
 * Jamais de publication : seul un administrateur publie, depuis /admin.
 * Note : les règles d’exclusion du module annuaire (lieux hors ligne éditoriale) s’appliquent à la relecture avant publication.
 */
export async function importCsv(payload: Payload, input: ImportInput, ctx: ActionContext, findKnown: KnownFinder = sqlKnownFinder(payload)): Promise<ImportReport> {
  requireRole(ctx, 'staff')
  if (input?.collection !== 'places') throw new OpsError('Seule la collection « places » (adresses) est importable.')
  if (typeof input.csv !== 'string' || !input.csv.trim()) throw new OpsError('Fichier CSV vide.')
  if (Buffer.byteLength(input.csv, 'utf8') > MAX_CSV_BYTES) throw new OpsError(`Fichier trop lourd (${MAX_CSV_LABEL} maximum).`)
  const parsed = parseCsv(input.csv)
  if (parsed.rows.length > MAX_CSV_ROWS) throw new OpsError(`Trop de lignes (${MAX_CSV_ROWS} maximum par import).`)
  const depuis = input.depuis == null ? 0 : Number(input.depuis)
  if (!Number.isInteger(depuis) || depuis < 0 || (depuis > 0 && depuis >= parsed.rows.length)) throw new OpsError('Reprise invalide (« depuis » hors du fichier).')
  const { lines, unknownColumns } = toPlaces(parsed, { wilaya: input.wilaya })
  const batch = lines.slice(depuis, depuis + IMPORT_BATCH).flatMap((l) => (l.data ? [l.data] : []))
  const plan = planBatch(lines, depuis, IMPORT_BATCH, batch.length ? await findKnown(batch) : [])
  const report: ImportReport = {
    mode: input.confirmer ? 'confirme' : 'simulation',
    lignes: parsed.rows.length,
    lot: { debut: plan.debut, fin: plan.fin, taille: IMPORT_BATCH },
    suite: plan.suite,
    colonnesIgnorees: unknownColumns,
    aCreer: plan.toCreate.map((t) => ({ line: t.line, name: t.data.name, city: t.data.city, category: t.data.category })),
    doublons: plan.duplicates,
    erreurs: plan.errors,
  }
  if (!input.confirmer) return report
  const req = await staffReq(payload, ctx)
  const who = ctx.principal.kind === 'staff' ? ctx.principal.name : 'équipe'
  const day = new Date().toISOString().slice(0, 10)
  report.crees = []
  report.echecs = []
  for (const { line, data } of plan.toCreate) {
    const { sourceUrl, ...fields } = data
    try {
      const doc = await payload.create({
        collection: 'places',
        req,
        overrideAccess: true,
        draft: true,
        context: { ...req.context, skipRevalidate: true },
        data: {
          ...fields,
          _status: 'draft',
          verification: 'spotted',
          source: { provider: 'dalil', url: sourceUrl, notes: `Import CSV du ${day} par ${who} (ligne ${line}).` },
        } as never,
      })
      report.crees.push({ line, id: doc.id, name: data.name })
    } catch (e) {
      report.echecs.push({ line, erreur: (e as Error).message.slice(0, 200) })
    }
  }
  return report
}
