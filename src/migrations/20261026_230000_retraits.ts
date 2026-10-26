import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Retraits décidés par Rad le 2026-10-26 : écoles et instituts de musique, zaouïas et écoles coraniques soufies
 * ou chiites, tout lieu qui sert de l’alcool.
 * Fiches dépubliées (brouillon), jamais supprimées : restaurables dans /admin, et un import futur ne les recrée pas
 * (identifiant source déjà présent). Motif écrit dans les notes de la fiche.
 */
const NOTE = 'Retirée le 2026-10-26 (règle DALIL) : '
const RELIGIOUS = ['Mosquées', 'Salles de prière', 'Écoles coraniques', 'Associations caritatives et entraide', 'Pompes funèbres musulmanes et toilette mortuaire']
const MUSIC = 'musiq|music|conservatoire|موسيق'
// Zaouïa (lieu ou confrérie) et noms de confréries soufies ; chiisme.
const SUFI = '\\m(zaou[iï]y?a|zaou[iï]et|zaouite|zawiy?a|tidjan[iy]+a|tijaniy+a|qadiriy+a|kadiri+a|rahmaniy+a|alaou?iy+a|alawiy+a|chadh?iliy+a|shadhiliy+a|ta[iï]biy+a|confr[ée]rie|tariqa)\\M|زاوي|الزاوية|طريقة|تيجاني|قادري|رحماني'
const SHIA = '\\m(chi[iï]tes?|shi[iy]tes?|shia|husa?[iy]n[iy]+a|hussainiya)\\M|شيعي|حسينية'
// Hors catégories religieuses (écoles publiques nommées d’après un quartier « Zaouia ») : seulement une école coranique de zaouïa.
const QURANIC = 'coran|quran|قرآن|قران'

export const up = deferred('20261026_230000_retraits', async ({ db, payload }: MigrateUpArgs): Promise<void> => {
  const run = (why: string, where: ReturnType<typeof sql>) =>
    db.execute(sql`UPDATE places SET _status = 'draft', source_notes = ${NOTE + why} || coalesce(' · ' || source_notes, '')
      WHERE _status = 'published' AND (${where}) RETURNING id`)
  const name = sql`(coalesce(name, '') || ' ' || coalesce(name_ar, ''))`
  const counts: Record<string, number> = {}
  counts.musique = (await run('musique', sql`${name} ~* ${MUSIC}`)).rows.length
  counts.soufi = (await run('zaouïa ou confrérie soufie', sql`(category = ANY(${`{${RELIGIOUS.join(',')}}`}::text[]) AND ${name} ~* ${SUFI})
    OR (${name} ~* ${QURANIC} AND ${name} ~* ${SUFI}) OR (sector IN ('education-formation', 'mosquees-priere') AND ${name} ~* '^\\s*(zaou[iï]y?a|zawiy?a|زاوية|الزاوية)')`)).rows.length
  counts.chiite = (await run('lieu chiite', sql`category = ANY(${`{${RELIGIOUS.join(',')}}`}::text[]) AND ${name} ~* ${SHIA}`)).rows.length
  // Alcool : signalé par OpenStreetMap (bar, pub, boîte de nuit, caviste, boissons alcoolisées servies) ou nom explicite.
  const file = path.resolve(process.cwd(), 'src/modules/annuaire/data/alcohol-osm.json')
  const ids = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { id: string }[]).map((x) => `osm:${x.id}`) : []
  counts.alcool = (await run('sert de l’alcool', sql`source_external_id = ANY(${`{${ids.join(',')}}`}::text[])
    OR (${name} ~* '\\m(cabaret|night ?club|discoth[eè]que|piano.?bar|wine ?bar|bar à vins?|brasserie|taverne|pub|beer|bi[eè]re|liquor|spiritueux|caviste|خمارة|حانة|ملهى)\\M'
        AND sector IN ('restaurants-gastronomie', 'hebergement-sejours', 'commerces-achats', 'bien-etre-sport'))`)).rows.length
  payload.logger.info(`Retraits : ${JSON.stringify(counts)}`)
})

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`UPDATE places SET _status = 'published', source_notes = nullif(regexp_replace(source_notes, ${'^' + NOTE + '[^·]*( · )?'}, ''), '')
    WHERE source_notes LIKE ${NOTE + '%'}`)
}
