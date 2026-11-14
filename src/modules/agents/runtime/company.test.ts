import { describe, expect, it } from 'vitest'
import { inputFiles, listRoles, loadRole, stageContext, stagesOf } from './company'

describe('dossier company/ (ICM)', () => {
  it('16 rôles : 6 actifs, 10 en réserve, 8 départements', async () => {
    const roles = await listRoles()
    expect(roles).toHaveLength(16)
    expect(roles.filter((r) => r.id.status === 'active').map((r) => r.id.slug).sort()).toEqual(['ceo', 'mediatheque', 'moderateur', 'redacteur', 'support', 'traducteur'])
    expect(new Set(roles.map((r) => r.id.department)).size).toBe(8)
  })

  it('chaque rôle a un agent_id unique, des outils et une interdiction Vie musulmane', async () => {
    const roles = await listRoles()
    expect(new Set(roles.map((r) => r.id.agent_id)).size).toBe(16)
    for (const r of roles) {
      expect(r.guardrails.tools.length).toBeGreaterThan(0)
      expect(r.guardrails.forbidden).toContain('vie-musulmane')
    }
  })

  it('chaque workflow a au moins une étape avec un contrat de moins de 80 lignes', async () => {
    for (const r of await listRoles()) {
      for (const wf of r.id.workflows) {
        const stages = await stagesOf(r, wf)
        expect(stages.length, `${r.id.slug}/${wf}`).toBeGreaterThan(0)
        for (const s of stages) expect((await stageContext(r, wf, s)).length).toBeGreaterThan(200)
      }
    }
  })

  it('le contexte d’étape charge L0, le rôle, le contrat et les entrées L3', async () => {
    const r = (await loadRole('redacteur'))!
    const ctx = await stageContext(r, '01-mise-a-jour-fiche', '02-redaction')
    expect(ctx).toContain('Règles d’or')
    expect(ctx).toContain('# Rédacteur')
    expect(ctx).toContain('02-redaction')
    expect(ctx).toContain('--- company/_config/interdits.md ---')
    expect(ctx).not.toContain('# Confiance')
  })

  it('inputFiles ne garde que les fichiers company/ des lignes de tableau', () => {
    expect(inputFiles('| A | company/_config/style.md | tout |\ncompany/hors-tableau.md\n| B | src/x.md |')).toEqual(['company/_config/style.md'])
  })
})
