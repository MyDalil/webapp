import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Lecture du dossier `company/` (méthode ICM) : la société décrite en fichiers.
 * L0 `AGENTS.md` toujours chargé ; L2 contrat d’étape ; L3 fichiers nommés dans la table « Entrées » (dans company/ seulement).
 */
export const COMPANY_DIR = path.join(process.cwd(), 'company')

export type RoleId = { agent_id: string; slug: string; name: string; department: string; reports_to: string; provider: 'anthropic' | 'openai'; model: string; status: 'active' | 'reserve'; workflows: string[]; version: string }
export type Guardrails = { tools: string[]; execute: string[]; propose: string[]; forbidden: string[]; max_steps: number; budget_usd_per_task: number }
export type Role = { id: RoleId; guardrails: Guardrails; agentMd: string; dir: string }

const read = (p: string) => readFile(p, 'utf8')

export async function listRoles(root = COMPANY_DIR): Promise<Role[]> {
  const deps = (await readdir(path.join(root, 'departements'))).filter((d) => /^\d\d-/.test(d)).sort()
  const roles: Role[] = []
  for (const dep of deps) {
    const agentsDir = path.join(root, 'departements', dep, 'agents')
    for (const slug of (await readdir(agentsDir).catch(() => [])).sort()) {
      const dir = path.join(agentsDir, slug)
      const [id, guardrails, agentMd] = await Promise.all([read(path.join(dir, 'id.json')), read(path.join(dir, 'guardrails.json')), read(path.join(dir, 'AGENT.md'))])
      roles.push({ id: JSON.parse(id) as RoleId, guardrails: JSON.parse(guardrails) as Guardrails, agentMd, dir })
    }
  }
  return roles
}

export async function loadRole(slug: string, root = COMPANY_DIR): Promise<Role | null> {
  return (await listRoles(root)).find((r) => r.id.slug === slug) ?? null
}

/** Fichiers `company/...` cités dans la table « Entrées » d’un contrat d’étape (références hors company/ ignorées). */
export function inputFiles(contextMd: string): string[] {
  const out = new Set<string>()
  for (const line of contextMd.split('\n')) {
    if (!line.startsWith('|')) continue
    const m = line.match(/company\/[\w./-]+\.md/g)
    m?.forEach((p) => out.add(p))
  }
  return [...out]
}

export async function stagesOf(role: Role, workflow: string, root = COMPANY_DIR): Promise<string[]> {
  const dir = path.join(root, 'departements', role.id.department, 'workflows', workflow)
  return (await readdir(dir).catch(() => [])).filter((s) => /^\d\d-/.test(s)).sort()
}

/** Contexte d’une étape : L0 + rôle + contrat d’étape + entrées L3. Rien d’autre (budget de jetons). */
export async function stageContext(role: Role, workflow: string, stage: string, root = COMPANY_DIR): Promise<string> {
  const l0 = await read(path.join(root, 'AGENTS.md'))
  const contract = await read(path.join(root, 'departements', role.id.department, 'workflows', workflow, stage, 'CONTEXT.md'))
  const refs = await Promise.all(
    inputFiles(contract).map(async (p) => {
      const abs = path.join(root, '..', p)
      if (!abs.startsWith(root)) return ''
      return `\n--- ${p} ---\n${await read(abs).catch(() => '(absent)')}`
    }),
  )
  return [l0, `--- ${role.id.name} (AGENT.md) ---\n${role.agentMd}`, `--- Étape ${stage} (CONTEXT.md) ---\n${contract}`, ...refs].join('\n\n')
}
