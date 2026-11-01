import type { Field } from 'payload'

/** Sources datées : obligatoires sur chaque fiche officielle (règle DALIL : rien sans source). */
export const sourcesField: Field = {
  name: 'sources',
  type: 'array',
  label: 'Sources (officielles, datées)',
  minRows: 1,
  fields: [
    { name: 'url', type: 'text', label: 'Adresse', required: true },
    { name: 'title', type: 'text', label: 'Titre', required: true },
    { name: 'checked', type: 'date', label: 'Consultée le', required: true },
  ],
}

export const linksField = (name: string, label: string): Field => ({
  name,
  type: 'array',
  label,
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true },
    { name: 'url', type: 'text', label: 'Adresse', required: true },
  ],
})

export const listField = (name: string, label: string): Field => ({ name, type: 'array', label, fields: [{ name: 'text', type: 'text', label: 'Texte', required: true }] })

export const statusField: Field = {
  name: 'status',
  type: 'select',
  label: 'Statut',
  required: true,
  defaultValue: 'published',
  options: [
    { label: 'Publiée', value: 'published' },
    { label: 'Brouillon', value: 'draft' },
    { label: 'Retirée (lien mort ou procédure supprimée)', value: 'retired' },
  ],
  admin: { position: 'sidebar' },
}
