'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Pin = { slug: string; name: string; category: string; city: string; pos: [number, number] | null; exact: boolean }

const ALGERIA: L.LatLngBoundsExpression = [
  [19, -8.7],
  [37.2, 12],
]

const tiles = () =>
  document.documentElement.dataset.theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Carte OpenStreetMap des adresses ; repère plein = position exacte, repère clair = centre de la ville. */
export function DirectoryMap({ places, zoom }: { places: Pin[]; zoom?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!box.current || map.current) return
    const m = L.map(box.current, { scrollWheelZoom: false, attributionControl: true, zoomControl: true })
    const base = L.tileLayer(tiles(), {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m)
    m.fitBounds(ALGERIA)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    const obs = new MutationObserver(() => base.setUrl(tiles()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      obs.disconnect()
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const located = places.filter((p) => p.pos)
    // Plusieurs adresses au même centre de ville : léger décalage pour qu’elles restent cliquables.
    const seen = new Map<string, number>()
    located.forEach((p, i) => {
      const key = p.pos!.join(',')
      const n = seen.get(key) ?? 0
      seen.set(key, n + 1)
      const r = p.exact || n === 0 ? 0 : Math.sqrt(n)
      const shift = [Math.sin(n * 2.4) * 0.01 * r, Math.cos(n * 2.4) * 0.013 * r]
      const icon = L.divIcon({
        className: 'dalil-marker',
        html: `<span class="map-pin${p.exact ? '' : ' approx'}"><span>${i + 1}</span></span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -36],
      })
      L.marker([p.pos![0] + shift[0], p.pos![1] + shift[1]], { icon, title: p.name, keyboard: true })
        .bindPopup(
          `<a class="map-popup" href="/adresses/${encodeURIComponent(p.slug)}"><small>${escape(p.category)} · ${escape(p.city)}</small><strong>${escape(p.name)}</strong>${p.exact ? '' : '<em>Position approximative</em>'}</a>`,
        )
        .addTo(g)
    })
    if (located.length === 1) m.setView(located[0].pos!, zoom ?? (located[0].exact ? 16 : 12))
    else if (located.length > 1) m.fitBounds(L.latLngBounds(located.map((p) => p.pos!)).pad(0.25), { maxZoom: 13 })
    else m.fitBounds(ALGERIA)
  }, [places, zoom])

  return <div ref={box} className="leaflet-box" />
}
