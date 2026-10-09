'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Mouvements du site, sans dépendance :
 * - [data-reveal] apparaît en douceur à l’entrée dans l’écran (délai via --i) ;
 * - [data-parallax="0.2"] se décale avec le défilement (profondeur) ;
 * tout est coupé si l’utilisateur a demandé moins d’animations.
 */
export function Motion() {
  const pathname = usePathname()
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reveal = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    if (reduce) {
      reveal.forEach((el) => el.classList.add('is-in'))
      return
    }
    document.documentElement.classList.add('motion')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    reveal.forEach((el) => io.observe(el))

    const layers = [...document.querySelectorAll<HTMLElement>('[data-parallax]')]
    let frame = 0
    const tick = () => {
      frame = 0
      const vh = window.innerHeight
      for (const el of layers) {
        const box = el.parentElement!.getBoundingClientRect()
        if (box.bottom < 0 || box.top > vh) continue
        const speed = Number(el.dataset.parallax) || 0.2
        el.style.transform = `translate3d(0, ${((box.top + box.height / 2 - vh / 2) * -speed).toFixed(1)}px, 0) scale(1.12)`
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pathname])
  return null
}
