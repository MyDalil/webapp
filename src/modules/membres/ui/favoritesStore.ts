import { hasMemberHint } from '@/platform/ui/memberHint'

/**
 * Favoris du membre, lus UNE fois par page et partagés par tous les boutons (avant : une requête par bouton,
 * soit 20 appels pour une liste de 20 fiches). Sans indice de connexion : aucune requête.
 */
let saved: Promise<Set<string>> | null = null
export const favKey = (itemType: string, itemKey: string) => `${itemType}:${itemKey}`

export function savedFavorites(): Promise<Set<string>> {
  if (!hasMemberHint()) return Promise.resolve(new Set())
  return (saved ??= fetch('/api/favorites', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { keys: [] }))
    .then((j: { keys?: string[] }) => new Set(j.keys ?? []))
    .catch(() => new Set<string>()))
}

/** Après un ajout ou un retrait : la liste partagée suit, sans relire le serveur. */
export function markFavorite(itemType: string, itemKey: string, on: boolean) {
  void saved?.then((s) => (on ? s.add(favKey(itemType, itemKey)) : s.delete(favKey(itemType, itemKey))))
}
