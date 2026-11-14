// Télécharge en vignettes (800 px) les candidats de scripts/import/stock-candidates.json, sans clé d’API.
// Pexels : images.pexels.com ; Unsplash : lien public de téléchargement. Sortie : data/stock-candidates/<sujet>/<banque>-<id>.jpg
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const OUT = 'data/stock-candidates'
const UA = 'Mozilla/5.0 (DALIL; salam@mydalil.com)'
const list = JSON.parse(readFileSync('scripts/import/stock-candidates.json', 'utf8'))
const url = (bank, id) => (bank === 'pexels' ? `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800` : `https://unsplash.com/photos/${id}/download?force=true&w=800`)
const report = {}
for (const [topic, items] of Object.entries(list)) {
  if (topic.startsWith('_')) continue
  mkdirSync(path.join(OUT, topic), { recursive: true })
  report[topic] = []
  for (const item of items) {
    const [bank, id] = item.split(':')
    const res = await fetch(url(bank, id), { headers: { 'user-agent': UA }, redirect: 'follow' }).catch(() => null)
    if (!res?.ok) {
      console.log('échec', item, res?.status)
      continue
    }
    writeFileSync(path.join(OUT, topic, `${bank}-${id}.jpg`), Buffer.from(await res.arrayBuffer()))
    report[topic].push(item)
  }
  console.log(topic, report[topic].length, '/', items.length)
}
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1))
