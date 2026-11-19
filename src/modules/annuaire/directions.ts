/** Lien d’itinéraire vers une position [lat, lng] — bouton « Itinéraire » et repère de la carte. */
export const directionsUrl = (pos: [number, number]) =>
  `https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}`
