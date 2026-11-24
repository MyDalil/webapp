'use client'

import { useEffect } from 'react'
import { bgValue } from './lazyBg'

const MARGIN = '300px'

/**
 * Chargement différé des fonds photo : chaque élément `[data-bg]` (voir `lazyBg`) reçoit son `background-image`
 * à 300 px de l’écran, y compris à l’horizontale dans les carrousels. Monté une seule fois pour tout le site ;
 * suit aussi les éléments rendus plus tard (navigation, composants clients, méga-menu qui s’ouvre).
 * Sans IntersectionObserver : tout est chargé d’emblée.
 */
export function LazyBackgrounds() {
  useEffect(() => {
    const show = (el: HTMLElement) => {
      el.style.backgroundImage = el.dataset.bg ? bgValue(el.dataset.bg) : ''
      // Photo retirée : pas d’attribut `style` vide laissé derrière (des règles CSS ciblent `:not([style])`).
      if (!el.getAttribute('style')) el.removeAttribute('style')
    }
    const within = (n: Node) => (n instanceof HTMLElement ? [...(n.matches('[data-bg]') ? [n] : []), ...n.querySelectorAll<HTMLElement>('[data-bg]')] : [])

    const canObserve = 'IntersectionObserver' in window
    // `scrollMargin` étend la marge aux conteneurs défilants (carrousels) ; sans lui, on charge aussi les deux fonds suivants.
    const nested = canObserve && 'scrollMargin' in IntersectionObserver.prototype
    const io = canObserve
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue
              const el = e.target as HTMLElement
              const group = nested ? [el] : [el, ...ahead(el)]
              for (const x of group) {
                io!.unobserve(x)
                show(x)
              }
            }
          },
          { rootMargin: MARGIN, scrollMargin: MARGIN } as IntersectionObserverInit,
        )
      : null
    const ahead = (el: HTMLElement) => {
      const all = [...document.querySelectorAll<HTMLElement>('[data-bg]')]
      return all.slice(all.indexOf(el) + 1, all.indexOf(el) + 3)
    }
    const watch = (el: HTMLElement) => (io ? io.observe(el) : show(el))

    within(document.body).forEach(watch)

    const mo =
      'MutationObserver' in window
        ? new MutationObserver((records) => {
            for (const r of records) {
              if (r.type === 'attributes') {
                // Photo changée sur un élément déjà en place (points du méga-menu, liste filtrée) ou retirée.
                const el = r.target as HTMLElement
                if (!el.dataset.bg || el.style.backgroundImage) {
                  io?.unobserve(el)
                  show(el)
                } else watch(el)
                continue
              }
              r.removedNodes.forEach((n) => within(n).forEach((el) => io?.unobserve(el)))
              r.addedNodes.forEach((n) => within(n).forEach(watch))
            }
          })
        : null
    mo?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-bg'] })

    return () => {
      io?.disconnect()
      mo?.disconnect()
    }
  }, [])
  return null
}
