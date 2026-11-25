import type { Metadata } from 'next'
import { getPlaces, getUpcomingEvents } from '@/modules/annuaire'
import { WeekendExplorer } from '@/modules/annuaire/ui'
import { withSectionGate } from '@/platform/ui/SectionGate'

export const metadata: Metadata = { title: 'Que faire ce week-end ?', description: 'Événements, sorties et lieux à visiter ce week-end en Algérie, par wilaya, avec des informations datées et sourcées.' }
export const revalidate = 604800 // 7 jours : la publication rafraîchit déjà la page à la demande (offre gratuite Vercel)

async function Weekend() {
  const [events, places] = await Promise.all([getUpcomingEvents(), getPlaces()])
  return (
    <div className="praticiens">
      <section className="praticiens-hero">
        <div className="container">
          <p className="eyebrow">Sorties &amp; découvertes</p>
          <h1>Que faire ce week-end ?</h1>
          <p className="auth-lead">Événements et lieux à visiter, par wilaya. Les événements confirmés citent leur source ; les autres sont signalés « à confirmer ».</p>
        </div>
      </section>
      <section className="section container">
        <WeekendExplorer events={events} places={places.filter((p) => p.cover && !p.cover.startsWith('/mockup'))} />
      </section>
    </div>
  )
}

export default withSectionGate(Weekend, () => '/que-faire-ce-week-end')
