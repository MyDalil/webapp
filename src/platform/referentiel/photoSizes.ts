// Tailles de photo, sans la table PHOTOS : importable par les composants clients présents sur toutes les pages (en-tête).

/**
 * Petit format (720 px, ~45 Ko au lieu de ~250 Ko) pour les tuiles et les cartes : `public/images/photos/sm/`.
 * Les grands visuels (héros, bandes parallaxe) gardent l’original. Une autre origine (Blob, autre dossier) est rendue telle quelle.
 * Nouvelle photo dans `public/images/photos/` : produire aussi son petit format (même nom, dossier `sm/`).
 */
export const smallPhoto = (src?: string | null) => (src && /^\/images\/photos\/[^/]+\.webp$/.test(src) ? src.replace('/images/photos/', '/images/photos/sm/') : src ?? undefined)

/**
 * Photo Wikimedia (couverture en 1920 px) ramenée à 960 px pour une tuile ou une carte ; jamais agrandie.
 * Largeurs standard seulement (960, 1280, 1920) : Wikimedia limite les tailles libres. Toute autre adresse (locale, Blob) est rendue telle quelle.
 */
export const wikiPhoto = (src?: string | null) =>
  src && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(src) ? src.replace(/\/(\d+)px-/, (m, w) => (Number(w) > 960 ? '/960px-' : m)) : src ?? undefined

/** Photo d’une tuile ou d’une carte (pas d’un héros) : Wikimedia en 960 px, photo locale en petit format (`smallPhoto`), Blob inchangé. */
export const tilePhoto = (src?: string | null) => smallPhoto(wikiPhoto(src))
