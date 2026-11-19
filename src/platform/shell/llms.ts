import { SECTORS } from '@/platform/referentiel/catalog'
import { RUBRICS } from './nav'

/** Liens du menu réservés aux comptes : jamais proposés aux robots. */
const PRIVATE = ['/mon-compte', '/annonces/deposer', '/espace', '/connexion']

/**
 * /llms.txt (format llmstxt.org) : présentation courte et factuelle de DALIL pour les IA, construite depuis le menu
 * (src/platform/shell/nav.ts) et le référentiel de l’annuaire — aucune donnée saisie à la main ici.
 */
export function llmsText(site: string): string {
  const link = (path: string) => `${site}${path === '/' ? '' : path}`
  const lines = [
    '# DALIL',
    '',
    '> DALIL, le guide de confiance pour explorer, vivre et avancer en Algérie : comprendre, découvrir, s’installer, vivre, entreprendre, trouver les bons interlocuteurs.',
    '',
    'Site en français (racine), en anglais (/en) et en arabe (/ar). Une information sans source ni date de vérification y est signalée « à vérifier ».',
    '',
    '## Accès pour les agents',
    '',
    `- [Serveur MCP public](${link('/api/mcp')})`,
    `- [Plan du site](${link('/sitemap.xml')})`,
    '',
  ]
  for (const r of RUBRICS) {
    lines.push(`## ${r.label}`, '')
    if (r.href) lines.push(`- [${r.label}](${link(r.href)})`)
    for (const [href, , title, sub] of r.entries) {
      if (PRIVATE.some((p) => href === p || href.startsWith(`${p}/`) || href.startsWith(`${p}#`) || href.startsWith(`${p}?`))) continue
      lines.push(`- [${title}](${link(href)}) : ${sub}`)
    }
    lines.push('')
  }
  lines.push('## Annuaire', '', `- [Annuaire](${link('/annuaire')})`)
  for (const s of SECTORS) lines.push(`- [${s.title}](${link(`/annuaire/${s.slug}`)}) : ${s.description}`)
  lines.push('')
  return lines.join('\n')
}
