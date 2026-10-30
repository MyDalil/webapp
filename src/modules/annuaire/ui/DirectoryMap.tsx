'use client'

import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MLMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Pin = { slug: string; name: string; category: string; city: string; pos: [number, number] | null; exact: boolean }

/**
 * Carte des adresses : fond OpenFreeMap (libre, sans clé ni compte, données OpenStreetMap), moteur MapLibre.
 * Les adresses proches se regroupent en bulles chiffrées qui s’ouvrent au zoom ; repère plein = position exacte,
 * repère clair = centre de la ville (en attente de vérification sur place).
 */
const ALGERIA: [[number, number], [number, number]] = [
  [-8.7, 19],
  [12, 37.2],
]
const GREEN = '#006b3c'
const dark = () => document.documentElement.dataset.theme === 'dark'
// OpenFreeMap (gratuit, sans clé, usage commercial permis) : « Liberty » en clair, « Dark » en sombre.
const styleUrl = () => `https://tiles.openfreemap.org/styles/${dark() ? 'dark' : 'liberty'}`
// Noms en français d’abord, puis en lettres latines, puis le nom local (décision de Rad, 2026-10-30).
const FR_LABEL = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']] as unknown as maplibregl.ExpressionSpecification
const frenchLabels = (m: MLMap) => {
  for (const l of m.getStyle().layers) if (l.type === 'symbol' && /name/.test(JSON.stringify(l.layout?.['text-field'] ?? '')) && l.source !== 'places') m.setLayoutProperty(l.id, 'text-field', FR_LABEL)
}
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const toGeoJSON = (places: Pin[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: places
    .filter((p) => p.pos)
    .map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.pos![1], p.pos![0]] },
      properties: { slug: p.slug, name: p.name, category: p.category, city: p.city, exact: p.exact },
    })),
})

function addLayers(m: MLMap, data: GeoJSON.FeatureCollection) {
  if (m.getSource('places')) return
  m.addSource('places', { type: 'geojson', data, cluster: true, clusterRadius: 46, clusterMaxZoom: 13 })
  m.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'places',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': GREEN,
      'circle-opacity': 0.92,
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 25, 150, 31],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  })
  m.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'places',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true },
    paint: { 'text-color': '#ffffff' },
  })
  m.addLayer({
    id: 'place',
    type: 'circle',
    source: 'places',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['case', ['get', 'exact'], GREEN, '#7fb89a'],
      'circle-radius': 8,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  })
}

export function DirectoryMap({ places, zoom }: { places: Pin[]; zoom?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const data = useRef<GeoJSON.FeatureCollection>(toGeoJSON(places))

  useEffect(() => {
    if (!box.current || map.current) return
    const m = new maplibregl.Map({ container: box.current, style: styleUrl(), bounds: ALGERIA, fitBoundsOptions: { padding: 24 }, scrollZoom: false, attributionControl: { compact: true } })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    m.on('style.load', () => {
      frenchLabels(m)
      addLayers(m, data.current)
    })
    m.on('click', 'clusters', async (e) => {
      const f = e.features?.[0]
      if (!f) return
      const z = await (m.getSource('places') as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number)
      m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z })
    })
    m.on('click', 'place', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as { slug: string; name: string; category: string; city: string; exact: boolean | string }
      const exact = p.exact === true || p.exact === 'true'
      new maplibregl.Popup({ offset: 14, closeButton: false })
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(`<a class="map-popup" href="/adresses/${encodeURIComponent(p.slug)}"><small>${escape(p.category)} · ${escape(p.city)}</small><strong>${escape(p.name)}</strong>${exact ? '' : '<em>Position approximative</em>'}</a>`)
        .addTo(m)
    })
    for (const id of ['clusters', 'place']) {
      m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
    }
    map.current = m
    // Thème clair / sombre : nouveau fond, mêmes repères.
    const obs = new MutationObserver(() => m.setStyle(styleUrl()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      obs.disconnect()
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    data.current = toGeoJSON(places)
    if (!m) return
    const apply = () => {
      ;(m.getSource('places') as GeoJSONSource | undefined)?.setData(data.current)
      const located = places.filter((p) => p.pos)
      if (located.length === 1) m.jumpTo({ center: [located[0].pos![1], located[0].pos![0]], zoom: zoom ?? (located[0].exact ? 15 : 11) })
      else if (located.length > 1) {
        const b = new maplibregl.LngLatBounds()
        for (const p of located) b.extend([p.pos![1], p.pos![0]])
        m.fitBounds(b, { padding: 48, maxZoom: 12, duration: 0 })
      } else m.fitBounds(ALGERIA, { duration: 0 })
    }
    if (m.isStyleLoaded() && m.getSource('places')) apply()
    else m.once('idle', apply)
  }, [places, zoom])

  return <div ref={box} className="leaflet-box" />
}
