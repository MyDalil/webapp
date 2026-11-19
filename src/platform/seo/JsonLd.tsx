import { serializeJsonLd, type Json } from './jsonLd'

/** Insère des données structurées schema.org dans la page (invisible, lu par les moteurs). */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
