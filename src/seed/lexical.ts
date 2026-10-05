/** Convertit un texte simple en état Lexical : "## " titre, "- " liste, ligne vide = paragraphe. */
type Node = Record<string, unknown>

const text = (t: string): Node => ({ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 })
const block = (type: string, children: Node[], extra: Node = {}): Node => ({ type, children, direction: 'ltr', format: '', indent: 0, version: 1, ...extra })

export function lexical(src: string) {
  const children: Node[] = []
  const lines = src.trim().split('\n')
  let list: Node[] = []
  const flush = () => {
    if (list.length) children.push(block('list', list, { listType: 'bullet', start: 1, tag: 'ul' }))
    list = []
  }
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) {
      flush()
      continue
    }
    if (l.startsWith('- ')) {
      list.push(block('listitem', [text(l.slice(2))], { value: list.length + 1 }))
      continue
    }
    flush()
    if (l.startsWith('## ')) children.push(block('heading', [text(l.slice(3))], { tag: 'h2' }))
    else children.push(block('paragraph', [text(l)], { textFormat: 0, textStyle: '' }))
  }
  flush()
  return { root: block('root', children) }
}
