import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { deferred } from '@/platform/deferredData'

export type Fact = { label: string; value: string; source: string }
type Db = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }

/** Remplace les faits des sources données pour les fiches listées (par identifiant source). Jamais ceux saisis dans /admin. */
export async function writeFacts(db: Db, all: Record<string, Fact[]>, sources: string[]) {
  const rows = Object.entries(all).flatMap(([ext, facts]) => facts.map((f, i) => ({ ext, order: i + 1, label: f.label, value: f.value, source: f.source })))
  await db.execute(sql`DELETE FROM places_facts WHERE source IN ${sources}`)
  for (let i = 0; i < rows.length; i += 2000) {
    await db.execute(sql`
      INSERT INTO places_facts (_order, _parent_id, id, label, value, source)
      SELECT x.order, p.id, substr(md5(random()::text || clock_timestamp()::text || x.ext || x.order), 1, 24), x.label, x.value, x.source
      FROM jsonb_to_recordset(${JSON.stringify(rows.slice(i, i + 2000))}::jsonb) AS x(ext text, "order" int, label text, value text, source text)
      JOIN places p ON p.source_external_id = x.ext`)
  }
}

/** Rédaction DALIL, vérifiée sur sources publiques (inscription du minbar, UNESCO 1992). */
const DJAMAA_EL_KEBIR = {
  id: 'Q2386475',
  name: 'Djamaâ El Kebir',
  intro:
    'La plus ancienne mosquée d’Alger, en bord de mer dans la basse Casbah, rue de la Marine. Son minbar porte une inscription datée de 1097 (490 de l’hégire), sous les Almoravides. Le minaret a été élevé au XIVe siècle par le sultan zianide Abou Tachfine. La mosquée fait partie de la Casbah d’Alger, inscrite au patrimoine mondial de l’UNESCO en 1992.',
  facts: [
    { label: 'Construction', value: '1097, Almoravides', source: 'dalil' },
    { label: 'Minaret', value: 'XIVe siècle, Zianides', source: 'dalil' },
    { label: 'Patrimoine', value: 'Casbah d’Alger, UNESCO 1992', source: 'dalil' },
    { label: 'Rite', value: 'Malékite', source: 'dalil' },
  ],
  duplicate: 'research:grande-mosquee-dalger-djamaa-el-kebir:alger',
}

/**
 * Corrections de données : fiche Djamaâ El Kebir (texte et faits rédigés par DALIL, doublon dépublié — restaurable),
 * écoles classées à tort en « Écoles coraniques ».
 */
export const up = deferred('20261026_213000_faits_lieux_donnees', async ({ db, payload }: MigrateUpArgs): Promise<void> => {
  await writeFacts(db as never, { [DJAMAA_EL_KEBIR.id]: DJAMAA_EL_KEBIR.facts }, ['dalil'])
  const d = DJAMAA_EL_KEBIR
  await db.execute(sql`UPDATE places SET name = ${d.name}, intro = ${d.intro} WHERE source_external_id = ${d.id}`)
  await db.execute(sql`
    UPDATE places m SET address = COALESCE(m.address, x.address)
    FROM places x WHERE m.source_external_id = ${d.id} AND x.source_external_id = ${d.duplicate}`)
  await db.execute(sql`UPDATE places SET _status = 'draft' WHERE source_external_id = ${d.duplicate}`)
  // Écoles étiquetées « religion=muslim » dans OpenStreetMap : seules celles dont le nom dit « coranique » le sont.
  // Les autres (écoles primaires, privées, sans précision) passent en « Écoles » — vrai dans tous les cas.
  const QURANIC = '(coran|quran|qur.an|قرآن|قران|كتاب|كتّاب|زاوية|zaou?ia|zawiya|tahfi?d|تحفيظ)'
  await db.execute(sql`
    UPDATE places SET sector = 'education-formation', category = 'Écoles', intro = replace(intro, 'École coranique', 'École')
    WHERE category = 'Écoles coraniques' AND source_provider = 'osm' AND name !~* ${QURANIC} AND coalesce(name_ar, '') !~* ${QURANIC}`)
  const { rows: n } = await db.execute(sql`SELECT count(DISTINCT _parent_id)::int AS n FROM places_facts`)
  payload.logger.info(`Faits des lieux : ${n[0]?.n ?? 0} fiches enrichies`)
})

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM places_facts WHERE source = 'dalil'`)
  await db.execute(sql`UPDATE places SET _status = 'published' WHERE source_external_id = ${DJAMAA_EL_KEBIR.duplicate}`)
}
