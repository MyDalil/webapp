import { describe, expect, it } from 'vitest'
import { buildNav, NAV_GROUPS } from './nav'

const ALL_COLLECTIONS = [
  'places', 'events', 'practitioners', 'appointments', 'providers', 'missions', 'mission-messages', 'provider-reviews', 'provider-documents',
  'classifieds', 'classified-messages', 'packs', 'demandes-accompagnement', 'procedures', 'platforms', 'representations', 'media', 'submissions',
  'contribution-photos', 'subscribers', 'campaigns', 'telegram-posts', 'members', 'visitor-sessions', 'users', 'agents', 'agent-tasks',
  'agent-messages', 'agent-notifications', 'ai-usage', 'error-logs', 'task-runs', 'email-deliveries', 'audit-log',
]
const ALL_GLOBALS = ['featured-destination', 'controls', 'accompagnement']

describe('menu du cockpit', () => {
  it('a 7 groupes dans l’ordre de la maquette', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Pilotage', 'Agents', 'Contenu', 'Communauté', 'Communication', 'Business', 'Système'])
  })

  it('range chaque collection et chaque réglage existants (aucun groupe « Autres »)', () => {
    const nav = buildNav({ collections: ALL_COLLECTIONS, globals: ALL_GLOBALS }, [])
    expect(nav.find((g) => g.key === 'autres')).toBeUndefined()
    const hrefs = nav.flatMap((g) => g.items.map((i) => i.href))
    for (const c of ALL_COLLECTIONS) expect(hrefs.some((h) => h.startsWith(`/admin/collections/${c}`))).toBe(true)
    for (const g of ALL_GLOBALS) expect(hrefs).toContain(`/admin/globals/${g}`)
  })

  it('un conseiller ne voit que l’accompagnement, même si d’autres collections sont lisibles', () => {
    const nav = buildNav({ collections: ALL_COLLECTIONS, globals: ALL_GLOBALS }, [''], 'conseiller')
    expect(nav.flatMap((g) => g.items).map((i) => i.href)).toEqual(['/admin/collections/demandes-accompagnement'])
  })

  it('cache un écran pas encore livré et passe à la collection de repli', () => {
    const before = buildNav({ collections: ['media'], globals: [] }, []).flatMap((g) => g.items)
    expect(before.find((i) => i.key === 'medias')?.href).toBe('/admin/collections/media')
    const after = buildNav({ collections: ['media'], globals: [] }, ['/cockpit/medias']).flatMap((g) => g.items)
    expect(after.find((i) => i.key === 'medias')?.href).toBe('/admin/cockpit/medias')
    expect(buildNav({ collections: [], globals: [] }, []).flatMap((g) => g.items).some((i) => i.key === 'boite')).toBe(false)
  })

  it('Validation filtre les tâches à valider', () => {
    const item = buildNav({ collections: ['agent-tasks'], globals: [] }, []).flatMap((g) => g.items).find((i) => i.key === 'validation')
    expect(item?.href).toBe('/admin/collections/agent-tasks?where%5Bstatus%5D%5Bequals%5D=review')
  })

  it('Vie musulmane est verrouillée pour les agents', () => {
    const item = buildNav({ collections: [], globals: [] }, ['/cockpit/vie-musulmane']).flatMap((g) => g.items).find((i) => i.key === 'vie-musulmane')
    expect(item?.lockedForAgents).toBe(true)
  })

  it('une collection inconnue va dans « Autres données »', () => {
    const nav = buildNav({ collections: ['nouvelle-collection'], globals: [] }, [])
    expect(nav).toEqual([{ key: 'autres', label: 'Autres données', items: [expect.objectContaining({ href: '/admin/collections/nouvelle-collection' })] }])
  })

  it('l’accueil pointe vers /admin', () => {
    const item = buildNav({ collections: [], globals: [] }, ['']).flatMap((g) => g.items)[0]
    expect(item).toMatchObject({ key: 'overview', href: '/admin' })
  })
})
