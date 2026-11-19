/**
 * Extras débranchables de DALIL. Variable `DALIL_PLUGINS` : liste séparée par des virgules (agents, cockpit, communication).
 * Absente : `communication` seulement. Vide (`DALIL_PLUGINS=`) : aucun extra.
 * - agents : équipe IA (file, /api/agents/*, menus de l’admin). Les collections restent enregistrées (tables, relations).
 * - cockpit : accueil Pilotage et vues /admin/cockpit/* ; sinon l’admin Payload standard.
 * - communication : publications du canal à échéance dans la tâche quotidienne.
 */
export const PLUGINS = ['agents', 'cockpit', 'communication'] as const
export type PluginName = (typeof PLUGINS)[number]

const DEFAULT: readonly PluginName[] = ['communication']

/** Lit la liste (insensible à la casse et aux espaces) ; les noms inconnus sont ignorés. */
export function parsePlugins(raw: string | undefined): Set<PluginName> {
  if (raw === undefined) return new Set(DEFAULT)
  const known = new Set<string>(PLUGINS)
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is PluginName => known.has(s)),
  )
}

export function pluginEnabled(name: PluginName, raw: string | undefined = process.env.DALIL_PLUGINS): boolean {
  return parsePlugins(raw).has(name)
}
