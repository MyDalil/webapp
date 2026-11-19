/** Composition d’une newsletter et de son résumé Telegram (pures, testées). Textes repris des fiches, rien n’est inventé. */
export type DigestPlace = { name: string; city?: string | null; category?: string | null; intro?: string | null; slug?: string | null }

const firstSentence = (t?: string | null) => {
  const s = (t ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  const m = s.match(/^.{20,220}?[.!?](\s|$)/)
  return (m ? m[0] : s.slice(0, 220)).trim()
}

export function composeDigest(places: DigestPlace[], o: { wilaya?: string; rubrique?: string; site: string; subject?: string }) {
  const scope = [o.rubrique, o.wilaya ? `à ${o.wilaya}` : ''].filter(Boolean).join(' ')
  const title = `Nouvelles adresses sur DALIL${scope ? ` — ${scope}` : ''}`
  const lines = places.map((p) => {
    const head = [p.name, [p.category, p.city].filter(Boolean).join(', ')].filter(Boolean).join(' — ')
    const intro = firstSentence(p.intro)
    return [head, intro, p.slug ? `${o.site}/adresses/${p.slug}` : ''].filter(Boolean).join('\n')
  })
  return {
    subject: (o.subject?.trim() || title).slice(0, 150),
    title,
    body: [`${places.length} adresse${places.length > 1 ? 's' : ''} publiée${places.length > 1 ? 's' : ''} ou mise${places.length > 1 ? 's' : ''} à jour récemment.`, ...lines].join('\n\n'),
    ctaLabel: 'Voir l’annuaire',
    ctaUrl: '/annuaire',
  }
}

export function telegramSummary(c: { title: string; body: string; ctaUrl?: string | null }, site: string) {
  const text = `${c.title}\n\n${c.body}`.slice(0, 3900)
  const url = c.ctaUrl ? (c.ctaUrl.startsWith('/') ? `${site}${c.ctaUrl}` : c.ctaUrl) : `${site}/annuaire`
  return { title: `Newsletter — ${c.title}`, text, buttons: [{ label: 'Voir sur DALIL', url }] }
}
