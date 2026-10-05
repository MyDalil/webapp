import type { Field, FieldHook } from 'payload'
import { lexicalToText, normalize, slugify } from '@/lib/normalize'

/** Slug auto-généré depuis un champ source, modifiable, unique. */
export const slugField = (source = 'title'): Field => {
  const fill: FieldHook = ({ value, data, originalDoc }) => {
    if (typeof value === 'string' && value.trim()) return slugify(value)
    const src = data?.[source] ?? originalDoc?.[source]
    const text = typeof src === 'string' ? src : typeof src === 'object' && src ? (src.fr ?? Object.values(src)[0]) : ''
    return text ? slugify(String(text)) : value
  }
  return {
    name: 'slug',
    type: 'text',
    unique: true,
    index: true,
    label: 'Adresse web (slug)',
    admin: { position: 'sidebar', description: 'Généré automatiquement depuis le titre. Modifiable.' },
    hooks: { beforeValidate: [fill] },
  }
}

/**
 * Texte de recherche normalisé (sans accents ni diacritiques), par langue.
 * Calculé à chaque enregistrement à partir des champs listés.
 */
export const searchField = (sources: string[]): Field => ({
  name: 'searchText',
  type: 'textarea',
  localized: true,
  index: true,
  admin: { hidden: true },
  hooks: {
    beforeChange: [
      ({ data, siblingData }) => {
        const d = { ...(data ?? {}), ...(siblingData ?? {}) } as Record<string, unknown>
        return normalize(
          sources
            .map((k) => {
              const v = d[k]
              if (typeof v === 'string') return v
              if (v && typeof v === 'object') return lexicalToText(v)
              return ''
            })
            .join(' '),
        )
      },
    ],
  },
})

export const sourcesField: Field = {
  name: 'sources',
  label: 'Sources',
  type: 'array',
  labels: { singular: 'Source', plural: 'Sources' },
  admin: { description: 'Toute information publiée est datée et sourcée.' },
  fields: [
    { name: 'label', type: 'text', required: true, label: 'Nom de la source' },
    { name: 'url', type: 'text', label: 'Lien' },
  ],
}
