// Coordonnées des 10 adresses reprises du prototype, cherchées dans OpenStreetMap (ODbL) — faits seulement.
// Une adresse reçoit un point seulement si OSM a UN seul lieu de restauration au même nom dans la wilaya ; sinon rien (position approximative conservée).
// Lancé par l’action « Coordonnées du prototype » ; sortie : src/modules/annuaire/data/prototype-coords.json.
import { readFileSync, writeFileSync } from 'node:fs'

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const ISO = { Alger: 'DZ-16', 'Béjaïa': 'DZ-06', Tlemcen: 'DZ-13', Annaba: 'DZ-23', Oran: 'DZ-31', Constantine: 'DZ-25' }
const listings = JSON.parse(readFileSync('src/modules/annuaire/listings.json', 'utf8'))
const esc = (s) => s.replace(/[’']/g, '.').replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '.' ? '.' : `\\${c}`))

async function overpass(q) {
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'user-agent': 'DALIL import (salam@mydalil.com)' } })
      if (r.ok) return (await r.json()).elements
    } catch {}
  }
  throw new Error('Overpass indisponible')
}

const out = {}
for (const l of listings) {
  const iso = ISO[l.city]
  const q = `[out:json][timeout:60];area["ISO3166-2"="${iso}"]->.w;nwr["name"~"^${esc(l.name)}$",i]["amenity"~"restaurant|fast_food|cafe"](area.w);out center tags;`
  const found = await overpass(q)
  const e = found.length === 1 ? found[0] : null
  const c = e ? (e.center ?? e) : null
  out[l.slug] = e ? { lat: c.lat, lng: c.lon, osm: `${e.type}/${e.id}`, name: e.tags.name, street: e.tags['addr:street'] ?? null } : { candidates: found.length }
  console.log(l.slug, '→', JSON.stringify(out[l.slug]))
  await new Promise((r) => setTimeout(r, 1500))
}
writeFileSync('src/modules/annuaire/data/prototype-coords.json', JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'OpenStreetMap (ODbL)', places: out }, null, 1))
