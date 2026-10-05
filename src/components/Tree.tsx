import { createElement, Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import type { Node } from '@/content'
import { ISLANDS } from './islands'

/** Rend un arbre de contenu extrait du prototype (voir scripts/extract-content.py). */
export function Tree({ nodes, overrides }: { nodes: Node[]; overrides?: Record<string, Record<string, unknown>> }) {
  return <>{nodes.map((n, i) => render(n, i, overrides))}</>
}

function render(n: Node, key: number, overrides?: Record<string, Record<string, unknown>>): ReactNode {
  if (n === null || n === undefined) return null
  if (typeof n === 'number') return n
  if (typeof n === 'string') return n === 'Guide & Installation Algérie' ? 'DALIL' : n
  if (!Array.isArray(n)) return null
  const kids = (list: Node[]) => list.map((c, i) => render(c, i, overrides))
  if (n[0] === 'el') {
    const [, tag, props, children] = n
    const p = { ...props, key } as Record<string, unknown>
    if (tag === 'img' || tag === 'input' || tag === 'br' || tag === 'hr' || tag === 'meta' || tag === 'link' || tag === 'source') return createElement(tag, p)
    return createElement(tag, p, ...kids(children))
  }
  if (n[0] === 'link') {
    const [, props, children] = n
    const { href, ...rest } = props as { href: string } & Record<string, unknown>
    return (
      <Link key={key} href={href || '/'} {...(rest as object)}>
        {kids(children)}
      </Link>
    )
  }
  if (n[0] === 'client') {
    const [, name, props] = n
    const Comp = ISLANDS[name]
    if (!Comp) return <Fragment key={key} />
    const { children, ...rest } = props as { children?: Node[] } & Record<string, unknown>
    return <Comp key={key} {...rest} {...(overrides?.[name] ?? {})}>{children ? kids(children) : null}</Comp>
  }
  return null
}
