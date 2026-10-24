// Recherche relancée à chaque modification de ce fichier (action « Coordonnées du prototype »).
// Coordonnées des 10 adresses reprises du prototype, cherchées dans OpenStreetMap (ODbL) — faits seulement.
// Une adresse reçoit un point seulement si OSM a UN seul lieu de restauration au nom identique dans la wilaya ; sinon rien (position approximative conservée), candidats notés pour l’équipe.
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

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/^(restaurant|resto|pizzeria|cafe|café)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()
const out = {}
for (const l of listings) {
  const iso = ISO[l.city]
  // Wilaya par code ISO ou par nom (étiquettes variables dans OSM) ; nom contenant le nom de l’adresse, lieux de restauration.
  const q = `[out:json][timeout:90];(area["ISO3166-2"="${iso}"];area["name:fr"~"${esc(l.city)}",i]["admin_level"="4"];)->.w;nwr["name"~"${esc(l.name)}",i]["amenity"~"restaurant|fast_food|cafe|food_court"](area.w);out center tags;`
  const found = await overpass(q)
  const candidates = found.map((e) => ({ name: e.tags.name, amenity: e.tags.amenity, lat: (e.center ?? e).lat, lng: (e.center ?? e).lon, osm: `${e.type}/${e.id}`, street: e.tags['addr:street'] ?? null }))
  const exact = candidates.filter((c) => norm(c.name) === norm(l.name))
  out[l.slug] = exact.length === 1 ? { ...exact[0], match: 'nom identique, seul dans la wilaya' } : { match: null, candidates }
  console.log(l.slug, '→', JSON.stringify(out[l.slug]))
  await new Promise((r) => setTimeout(r, 1500))
}
writeFileSync('src/modules/annuaire/data/prototype-coords.json', JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'OpenStreetMap (ODbL)', places: out }, null, 1))
