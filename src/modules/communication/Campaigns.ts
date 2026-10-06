import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '@/platform/access'
import { SITE, TEAM, esc, layout, paragraphs, send, sendBatch, unsubscribe } from '@/platform/mail'

const render = (doc: { title: string; body: string; ctaLabel?: string | null; ctaUrl?: string | null }, footer?: string) =>
  layout(
    esc(doc.title),
    paragraphs(doc.body),
    doc.ctaLabel && doc.ctaUrl ? { label: doc.ctaLabel, href: doc.ctaUrl.startsWith('/') ? `${SITE}${doc.ctaUrl}` : doc.ctaUrl } : undefined,
    footer,
  )

/** « Envoyer un test » → à l’équipe ; « Envoyer aux abonnés » → une seule fois, aux inscrits confirmés et non désinscrits. */
const dispatch: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context.dispatching) return doc
  if (doc.sendTest) {
    await send(TEAM, `[TEST] ${doc.subject}`, render(doc, 'Ceci est un envoi de test.'))
    await req.payload.update({ collection: 'campaigns', id: doc.id, data: { sendTest: false }, context: { dispatching: true }, req, overrideAccess: true })
  }
  if (doc.sendNow && !doc.sentAt) {
    const { docs } = await req.payload.find({
      collection: 'subscribers',
      where: { and: [{ confirmedAt: { exists: true } }, { unsubscribedAt: { exists: false } }] },
      limit: 10000,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })
    const messages = docs
      .filter((s) => s.unsubToken)
      .map((s) => {
        const u = unsubscribe(s.unsubToken as string)
        return { to: s.email, subject: doc.subject, html: render(doc, u.footer), headers: u.headers }
      })
    const sent = await sendBatch(messages)
    await req.payload.update({
      collection: 'campaigns',
      id: doc.id,
      data: { sendNow: false, sentAt: new Date().toISOString(), recipients: sent },
      context: { dispatching: true },
      req,
      overrideAccess: true,
    })
  }
  return doc
}

export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  labels: { singular: 'Newsletter', plural: 'Envois newsletter' },
  admin: {
    group: 'Boîte de réception',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'sentAt', 'recipients', 'updatedAt'],
    description: 'Rédigez, envoyez-vous un test, puis envoyez aux abonnés confirmés. Offre Resend gratuite : 100 emails par jour au maximum.',
  },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isAdmin },
  hooks: { afterChange: [dispatch] },
  fields: [
    { name: 'subject', type: 'text', label: 'Objet de l’email', required: true },
    { name: 'title', type: 'text', label: 'Titre', required: true },
    { name: 'body', type: 'textarea', label: 'Texte', required: true, admin: { description: 'Une ligne vide sépare les paragraphes.', rows: 12 } },
    {
      type: 'row',
      fields: [
        { name: 'ctaLabel', type: 'text', label: 'Bouton (texte)' },
        { name: 'ctaUrl', type: 'text', label: 'Bouton (lien)', admin: { description: 'Ex. /annuaire ou https://…' } },
      ],
    },
    { name: 'sendTest', type: 'checkbox', label: 'Envoyer un test à salam@mydalil.com à l’enregistrement', admin: { position: 'sidebar' } },
    {
      name: 'sendNow',
      type: 'checkbox',
      label: 'Envoyer aux abonnés à l’enregistrement',
      access: { update: ({ req }) => req.user?.role === 'admin', create: ({ req }) => req.user?.role === 'admin' },
      admin: { position: 'sidebar', description: 'Réservé aux administrateurs. Envoi unique et définitif.', condition: (data) => !data?.sentAt },
    },
    { name: 'sentAt', type: 'date', label: 'Envoyée le', admin: { position: 'sidebar', readOnly: true, date: { displayFormat: 'd MMMM yyyy HH:mm' } } },
    { name: 'recipients', type: 'number', label: 'Destinataires', admin: { position: 'sidebar', readOnly: true } },
  ],
}
