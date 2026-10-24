'use client'

import dynamic from 'next/dynamic'

/** Mini-carte d’une fiche (Leaflet chargé uniquement côté navigateur). */
export const PlaceMap = dynamic(() => import('./DirectoryMap').then((m) => m.DirectoryMap), { ssr: false })
