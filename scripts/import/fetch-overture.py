# Lieux d’Algérie dans Overture Maps (thème « places », licence CDLA Permissive 2.0 — réutilisation et stockage permis,
# attribution « © Overture Maps Foundation »). Couverture proche des grands services de cartes (sources Meta, Microsoft…).
# Sortie : data/overture-dz.jsonl.gz (brut, archivé dans Vercel Blob), overture-stats.json et overture-mosques.json (versionnés).
import duckdb, gzip, json, os, urllib.request, collections

OUT = 'src/modules/annuaire/data'
os.makedirs(OUT, exist_ok=True)
cat = json.load(urllib.request.urlopen('https://stac.overturemaps.org/catalog.json'))
release = cat.get('latest') or sorted(l['href'].split('/')[1] for l in cat['links'] if l.get('rel') == 'child')[-1]
release = release.strip('./').split('/')[0]
print('version Overture', release)
con = duckdb.connect()
con.sql("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
src = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"
cols = [r[0] for r in con.sql(f"DESCRIBE SELECT * FROM read_parquet('{src}', hive_partitioning=1) LIMIT 1").fetchall()]
print('colonnes', cols)
keep = [c for c in cols if c not in ('geometry',)]
rows = con.sql(f"""
  SELECT {', '.join(keep)}, (bbox.xmin + bbox.xmax) / 2 AS lng, (bbox.ymin + bbox.ymax) / 2 AS lat
  FROM read_parquet('{src}', hive_partitioning=1)
  WHERE bbox.xmin > -8.7 AND bbox.xmax < 12.0 AND bbox.ymin > 18.9 AND bbox.ymax < 37.2
    AND (addresses IS NULL OR len(addresses) = 0 OR addresses[1].country = 'DZ')
""").fetchdf()
print('lignes dans le cadre', len(rows))
def js(v):
    try:
        return json.loads(json.dumps(v, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o)))
    except Exception:
        return str(v)
stats = collections.Counter()
mosques = []
n = 0
with gzip.open(f'{OUT}/overture-dz.jsonl.gz', 'wt', encoding='utf-8') as f:
    for rec in rows.to_dict('records'):
        rec = {k: js(v) for k, v in rec.items()}
        addr = rec.get('addresses') or []
        country = (addr[0] or {}).get('country') if addr else None
        if country not in (None, 'DZ'):
            continue
        cats = rec.get('categories') or {}
        primary = (cats or {}).get('primary') or (rec.get('basic_category')) or 'inconnu'
        stats[primary] += 1
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        n += 1
        alt = ' '.join((cats or {}).get('alternate') or [])
        name = ((rec.get('names') or {}).get('primary') or '')
        if 'mosque' in f'{primary} {alt}' or 'islam' in f'{primary} {alt}' or any(w in name.lower() for w in ('mosqu', 'masjid', 'مسجد', 'جامع')):
            mosques.append(rec)
json.dump({'release': release, 'total': n, 'categories': dict(stats.most_common())}, open(f'{OUT}/overture-stats.json', 'w'), ensure_ascii=False, indent=1)
json.dump(mosques, open(f'{OUT}/overture-mosques.json', 'w'), ensure_ascii=False)
print('Algérie', n, 'mosquées', len(mosques))
