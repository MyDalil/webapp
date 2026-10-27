/**
 * Photos libres du site (Wikimedia Commons), avec auteur et licence — détail sur /credits-photos.
 * Une photo ne sert que pour un sujet qu’elle montre vraiment.
 */
export type Photo = { src: string; alt: string; credit: string }

export const PHOTOS = {
  alger: { src: '/images/algeria/alger.webp', alt: 'Baie d’Alger', credit: 'Baie d’Alger · Manini row · CC BY-SA 4.0' },
  annaba: { src: '/images/algeria/annaba.webp', alt: 'Littoral d’Annaba', credit: 'Annaba · Lola.number01 · CC BY-SA 4.0' },
  bejaia: { src: '/images/algeria/bejaia.webp', alt: 'Littoral de Béjaïa', credit: 'Béjaïa · khodja SE · CC BY-SA 4.0' },
  constantine: { src: '/images/algeria/constantine.webp', alt: 'Pont de Constantine', credit: 'Constantine · Abdousid · CC BY-SA 4.0' },
  ghardaia: { src: '/images/algeria/ghardaia-mzab.webp', alt: 'Vallée du M’Zab', credit: 'Ghardaïa · Camille Gillet · CC BY-SA 4.0' },
  djurdjura: { src: '/images/algeria/kabylie-djurdjura.webp', alt: 'Massif du Djurdjura', credit: 'Djurdjura · Melb13 · CC BY-SA 4.0' },
  oran: { src: '/images/algeria/oran.webp', alt: 'Baie et port d’Oran', credit: 'Oran · Trippiit / Simona · CC BY-SA 2.0' },
  djanet: { src: '/images/algeria/tadrart-djanet.webp', alt: 'Tadrart Rouge près de Djanet', credit: 'Tadrart Rouge · 2 F Ī K Æ Ł T Ë R · CC0' },
  tipasa: { src: '/images/algeria/tipasa.webp', alt: 'Site antique de Tipasa', credit: 'Tipasa · Bernard Gagnon · CC BY 4.0' },
  tlemcen: { src: '/images/algeria/tlemcen.webp', alt: 'Mosquée Sidi Boumediene à Tlemcen', credit: 'Tlemcen · Tonowari · CC BY-SA 4.0' },
  usthb: { src: '/images/algeria/usthb-library.webp', alt: 'Bibliothèque de l’USTHB à Alger', credit: 'USTHB · Engineerdz · CC BY-SA 4.0' },
  couscous: { src: '/images/algeria/couscous.webp', alt: 'Couscous algérien aux légumes', credit: 'Couscous · HaJunkiyada / Liat Portal · CC BY-SA 4.0' },
  'ccr': { src: '/images/photos/ccr.webp', alt: "Ferry d’Algérie Ferries au port", credit: "Ferry d’Algérie Ferries au port · Bertrand SOUBEYRAND · CC BY-SA 4.0" },
  'logement': { src: '/images/photos/logement.webp', alt: "Nouveaux immeubles de logements en Oranie", credit: "Nouveaux immeubles de logements en Oranie · Maya-Anaïs Yataghène · CC BY 2.0" },
  'mairie': { src: '/images/photos/mairie.webp', alt: "Mairie de Khenchela", credit: "Mairie de Khenchela · mosbah Mosbah · CC BY-SA 3.0" },
  'mairie-blida': { src: '/images/photos/mairie-blida.webp', alt: "Mairie de Blida", credit: "Mairie de Blida · mekfouldji abdelkrim · CC BY 2.0" },
  'poste': { src: '/images/photos/poste.webp', alt: "Bureau d’Algérie Poste", credit: "Bureau d’Algérie Poste · Magharebia · CC BY 2.0" },
  'telecom': { src: '/images/photos/telecom.webp', alt: "Agence Algérie Télécom", credit: "Agence Algérie Télécom · Bernard Gagnon · CC BY 4.0" },
  'aeroport': { src: '/images/photos/aeroport.webp', alt: "Hall de l’aéroport d’Alger", credit: "Hall de l’aéroport d’Alger · Mouh2jijel · CC BY-SA 3.0" },
  'ambassade': { src: '/images/photos/ambassade.webp', alt: "Ambassade d’Algérie", credit: "Ambassade d’Algérie · Marsupium · CC BY 4.0" },
  'protection-civile': { src: '/images/photos/protection-civile.webp', alt: "Véhicule de la Protection civile", credit: "Véhicule de la Protection civile · Jawi13 · CC BY-SA 4.0" },
  'ecole': { src: '/images/photos/ecole.webp', alt: "École primaire en Algérie", credit: "École primaire en Algérie · flickr.com · CC BY 2.0" },
  'hopital': { src: '/images/photos/hopital.webp', alt: "Entrée de l’hôpital Mustapha Pacha", credit: "Entrée de l’hôpital Mustapha Pacha · Yelles · CC BY-SA 3.0" },
  'tramway': { src: '/images/photos/tramway.webp', alt: "Tramway d’Alger", credit: "Tramway d’Alger · habib kaki · CC BY 3.0" },
  'pharmacie': { src: '/images/photos/pharmacie.webp', alt: "Pharmacie à Aflou", credit: "Pharmacie à Aflou · habib kaki · CC BY 3.0" },
  'kaaba': { src: '/images/photos/kaaba.webp', alt: "La Kaaba pendant le Hajj", credit: "La Kaaba pendant le Hajj · Adli Wahid, retouches Basile Morin · CC BY-SA 4.0" },
  'plage': { src: '/images/photos/plage.webp', alt: "Plage de Madagh, Oran", credit: "Plage de Madagh, Oran · Mbelkahla2 · CC BY-SA 3.0" },
  'jardin': { src: '/images/photos/jardin.webp', alt: "Jardin d’Essai du Hamma, Alger", credit: "Jardin d’Essai du Hamma, Alger · Elhadj Hocine · CC BY-SA 4.0" },
  'concert': { src: '/images/photos/concert.webp', alt: "Spectacle à Koléa", credit: "Spectacle à Koléa · Amine959 · CC BY-SA 3.0" },
  'djamaa': { src: '/images/photos/djamaa.webp', alt: "Djamaâ El-Djazaïr de nuit", credit: "Djamaâ El-Djazaïr de nuit · Riad Salih · CC BY 4.0" },
  'passeport': { src: '/images/photos/passeport.webp', alt: "Passeport algérien", credit: "Passeport algérien · Jemo2200 · CC BY-SA 4.0" },
} satisfies Record<string, Photo>

export type PhotoKey = keyof typeof PHOTOS
