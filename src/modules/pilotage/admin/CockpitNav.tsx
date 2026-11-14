import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import type { PayloadRequest, ServerProps, VisibleEntities } from 'payload'
import { getBadges } from '../kpis'
import { CockpitNavClient } from './CockpitNavClient'
import { COCKPIT_VIEWS, depsFor, killSwitchMode } from './data'
import { asLang, t } from './i18n'
import { buildNav, type Role } from './nav'

type Props = ServerProps & { req?: PayloadRequest; visibleEntities?: VisibleEntities }

/** Menu du cockpit (remplace le menu natif de Payload). */
export async function CockpitNav(props: Props) {
  const { req, visibleEntities, i18n } = props
  if (!req?.user || !visibleEntities) return null
  const lang = asLang(i18n?.language)
  const tr = t(lang)
  const [badges, ks] = await Promise.all([getBadges(depsFor(req)).catch(() => ({})), killSwitchMode(req)])
  const groups = buildNav(visibleEntities, COCKPIT_VIEWS, (req.user as { role?: Role }).role).map((g) => ({
    key: g.key,
    label: tr(`group.${g.key}`, g.label),
    items: g.items.map((i) => ({ ...i, label: g.key === 'autres' ? i.label : tr(`nav.${i.key}`, i.label), count: i.badge ? (badges as Record<string, number>)[i.badge] ?? 0 : 0, hot: i.badge === 'validation' })),
  }))
  return (
    <CockpitNavClient
      groups={groups}
      killSwitchOn={ks !== 'off'}
      labels={{ team: tr('ui.team'), locked: tr('ui.locked'), killswitch: tr('ui.killswitch'), ksOff: tr('ui.ks.off'), ksOn: tr('ui.ks.on'), ksManage: tr('ui.ks.manage'), logout: tr('ui.logout'), close: tr('ui.close') }}
    />
  )
}
