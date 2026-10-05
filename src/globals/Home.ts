import type { GlobalConfig } from 'payload'
import { anyone, isStaff } from '@/lib/access'
import { revalidateGlobal } from '@/lib/revalidate'

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Page d’accueil',
  admin: { group: 'Contenus' },
  access: { read: anyone, update: isStaff },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    { name: 'kicker', type: 'text', label: 'Surtitre', localized: true },
    { name: 'title', type: 'text', label: 'Titre principal', localized: true },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre', localized: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Image d’accueil' },
    {
      name: 'suggestions',
      type: 'array',
      label: 'Suggestions de recherche',
      maxRows: 6,
      fields: [{ name: 'text', type: 'text', localized: true }],
    },
    {
      name: 'featuredGuides',
      type: 'relationship',
      relationTo: 'guides',
      hasMany: true,
      label: 'Guides mis en avant',
      maxRows: 6,
    },
    {
      name: 'announcement',
      type: 'text',
      label: 'Bandeau d’annonce (optionnel)',
      localized: true,
    },
  ],
}

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Réglages du site',
  admin: { group: 'Administration' },
  access: { read: anyone, update: isStaff },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    { name: 'contactEmail', type: 'email', label: 'Email de contact public' },
    {
      name: 'social',
      type: 'group',
      label: 'Réseaux sociaux',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
        { name: 'tiktok', type: 'text' },
        { name: 'linkedin', type: 'text' },
      ],
    },
  ],
}
