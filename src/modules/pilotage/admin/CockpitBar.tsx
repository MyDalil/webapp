import type { PayloadRequest, ServerProps, VisibleEntities } from 'payload'
import { CommandBar } from './CommandBar'
import { viewsFor } from './data'
import { asLang, t } from './i18n'
import { buildNav, type Role } from './nav'

type Props = ServerProps & { req?: PayloadRequest; visibleEntities?: VisibleEntities }

/** Barre du haut : palette ⌘K, langue, thème. */
export function CockpitBar({ req, visibleEntities, i18n }: Props) {
  if (!req?.user || !visibleEntities) return null
  const tr = t(asLang(i18n?.language))
  const pages = buildNav(visibleEntities, viewsFor((req.user as { role?: Role }).role), (req.user as { role?: Role }).role).flatMap((g) =>
    g.items.map((i) => ({ label: g.key === 'autres' ? i.label : tr(`nav.${i.key}`, i.label), group: tr(`group.${g.key}`, g.label), href: i.href, icon: i.icon })),
  )
  const searchable = (['places', 'providers', 'classifieds', 'members', 'procedures'] as const).filter((c) => visibleEntities.collections.includes(c))
  return (
    <CommandBar
      pages={pages}
      searchable={searchable}
      labels={{ search: tr('ui.search'), placeholder: tr('ui.cmd.placeholder'), pages: tr('ui.cmd.pages'), results: tr('ui.cmd.results'), none: tr('ui.cmd.none'), theme: tr('ui.theme'), lang: tr('ui.lang'), close: tr('ui.close') }}
    />
  )
}
