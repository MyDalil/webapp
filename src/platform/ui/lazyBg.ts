/**
 * Fond photo chargé à l’approche de l’écran : `<div className="…" {...lazyBg(url)} />` à la place de `style={{ backgroundImage }}`.
 * Le composant `LazyBackgrounds` (monté une fois dans la mise en page publique) pose le fond quand l’élément approche.
 * À réserver aux fonds hors du premier écran (tuiles, carrousels, méga-menu) : un héros garde son `style` immédiat.
 */
export const lazyBg = (url?: string | null): { 'data-bg'?: string } => (url ? { 'data-bg': url } : {})

/** Valeur CSS d’un fond : adresse entre guillemets (parenthèses et espaces des noms de fichiers sans risque). */
export const bgValue = (url: string) => `url(${JSON.stringify(url)})`
