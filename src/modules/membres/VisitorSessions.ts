import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'

/** Profils test, favoris, listes et checklist des visiteurs (cookie de session, 7 jours). */
export const VisitorSessions: CollectionConfig = {
  slug: 'visitor-sessions',
  labels: { singular: 'Session visiteur', plural: 'Sessions visiteurs' },
  admin: { useAsTitle: 'sid', defaultColumns: ['sid', 'expiresAt', 'updatedAt'], group: 'Boîte de réception' },
  access: { read: isStaff, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'sid', type: 'text', required: true, unique: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'profile', type: 'json' },
    { name: 'state', type: 'json', label: 'Favoris, listes, checklist, parcours' },
  ],
}
