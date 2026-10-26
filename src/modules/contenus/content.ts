import 'server-only'
import routes from './routes.json'
import shell from './shell.json'

export type Node = string | number | null | ['el', string, Record<string, unknown>, Node[]] | ['link', Record<string, unknown>, Node[]] | ['client', string, Record<string, unknown>]

export type PageContent = { content: Node[] }

export const ROUTES = routes as string[]
export const SHELL = shell as { header: Node; footer: Node }

const fileFor = (route: string) => (route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '__'))

export async function getPage(route: string): Promise<PageContent | null> {
  if (!ROUTES.includes(route)) return null
  const mod = await import(`./pages/${fileFor(route)}.json`)
  return mod.default as PageContent
}

/** Titre de la page : premier h1 du contenu. */
export function firstHeading(nodes: Node[]): string | null {
  for (const n of nodes) {
    if (!Array.isArray(n)) continue
    if (n[0] === 'el') {
      if (n[1] === 'h1') return textOf(n[3])
      const inner = firstHeading(n[3])
      if (inner) return inner
    } else if (n[0] === 'link') {
      const inner = firstHeading(n[2])
      if (inner) return inner
    }
  }
  return null
}

export function textOf(nodes: Node[]): string {
  return nodes
    .map((n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? (n[0] === 'el' ? textOf(n[3]) : n[0] === 'link' ? textOf(n[2]) : '') : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Premier paragraphe utile, pour la meta description. */
export function firstParagraph(nodes: Node[]): string | null {
  for (const n of nodes) {
    if (!Array.isArray(n)) continue
    if (n[0] === 'el') {
      if (n[1] === 'p') {
        const t = textOf(n[3])
        if (t.length > 40) return t.slice(0, 180)
      }
      const inner = firstParagraph(n[3])
      if (inner) return inner
    }
  }
  return null
}
