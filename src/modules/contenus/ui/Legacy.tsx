import { getPage, type Node } from '../content'
import { Tree } from './Tree'

const cls = (n: Node) => (Array.isArray(n) && n[0] === 'el' ? String(n[2].className ?? '') : '')

/** Contenu du prototype pour une route, en retirant certaines sections (ex. son ancien en-tête de page). */
export async function Legacy({ route, skip = [] }: { route: string; skip?: string[] }) {
  const page = await getPage(route)
  const nodes = (page?.content ?? []).filter((n) => !skip.some((s) => cls(n).includes(s)))
  return (
    <div className="legacy">
      <Tree nodes={nodes} />
    </div>
  )
}
