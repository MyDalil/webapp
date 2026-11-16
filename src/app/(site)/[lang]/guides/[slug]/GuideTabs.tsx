'use client'
import { useEffect, useState } from 'react'

/** Onglets fixes d’une page guide : un clic mène à la section, l’onglet suit la lecture. */
export function GuideTabs({ tabs }: { tabs: { id: string; label: string; n?: number }[] }) {
  const [on, setOn] = useState(tabs[0]?.id)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setOn(e.target.id)), { rootMargin: '-140px 0px -60% 0px' })
    tabs.forEach((t) => {
      const el = document.getElementById(t.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [tabs])
  return (
    <nav className="g-tabs" aria-label="Dans cette page">
      <div className="container xp-narrow">
        {tabs.map((t) => (
          <a key={t.id} href={`#${t.id}`} aria-current={on === t.id ? 'true' : undefined}>
            {t.label}
            {t.n != null && <b>{t.n}</b>}
          </a>
        ))}
      </div>
    </nav>
  )
}
