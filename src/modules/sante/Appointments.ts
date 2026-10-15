import type { Access, CollectionConfig, Where } from 'payload'
import { isMember, isStaff } from '@/platform/access'

/** Équipe : tout. Patient : ses rendez-vous. Praticien : les rendez-vous de son agenda. */
const readOwn: Access = (args) => {
  if (isStaff(args)) return true
  const { user } = args.req
  if (!isMember(user)) return false
  return { or: [{ patient: { equals: user.id } }, { 'practitioner.owner': { equals: user.id } }] } as Where
}

export const Appointments: CollectionConfig = {
  slug: 'appointments',
  labels: { singular: 'Rendez-vous', plural: 'Rendez-vous' },
  admin: { group: 'Santé', useAsTitle: 'start', defaultColumns: ['start', 'practitioner', 'patient', 'mode', 'status'] },
  access: { read: readOwn, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { type: 'row', fields: [{ name: 'practitioner', type: 'relationship', relationTo: 'practitioners', required: true, index: true }, { name: 'patient', type: 'relationship', relationTo: 'members', required: true, index: true }] },
    { type: 'row', fields: [{ name: 'start', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } }, { name: 'end', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } }] },
    { type: 'row', fields: [{ name: 'mode', type: 'select', required: true, options: [{ label: 'Au cabinet', value: 'cabinet' }, { label: 'En visio', value: 'visio' }] }, { name: 'status', type: 'select', required: true, defaultValue: 'confirmed', index: true, options: [{ label: 'Confirmé', value: 'confirmed' }, { label: 'Annulé', value: 'cancelled' }, { label: 'Honoré', value: 'completed' }, { label: 'Non honoré', value: 'no_show' }] }] },
    { name: 'reason', type: 'textarea', label: 'Motif (court, sans détail médical)', maxLength: 300 },
    { type: 'row', fields: [{ name: 'cancelledBy', type: 'select', options: [{ label: 'Patient', value: 'patient' }, { label: 'Praticien', value: 'practitioner' }, { label: 'Équipe', value: 'staff' }] }, { name: 'cancelReason', type: 'text', label: 'Motif d’annulation' }] },
    { name: 'videoUrl', type: 'text', label: 'Lien visio', admin: { description: 'Généré par le service visio (non choisi pour l’instant).' } },
    { type: 'row', fields: [{ name: 'consentAt', type: 'date', required: true, label: 'Consentement du patient' }, { name: 'reminderSentAt', type: 'date', label: 'Rappel envoyé' }] },
    /** Garantit qu’un créneau n’est réservé qu’une fois : vidé à l’annulation. */
    { name: 'slotKey', type: 'text', unique: true, index: true, admin: { readOnly: true, hidden: true } },
  ],
}
