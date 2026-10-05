'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

export type FormState = { ok: boolean; error?: string } | null

const clean = (v: FormDataEntryValue | null, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

/** Anti-spam : champ piège + délai minimal de remplissage. */
function isBot(fd: FormData) {
  if (clean(fd.get('website_hp'))) return true
  const t = Number(clean(fd.get('_t')))
  return !t || Date.now() - t < 2500
}

export async function subscribe(_: FormState, fd: FormData): Promise<FormState> {
  if (isBot(fd)) return { ok: true }
  const email = clean(fd.get('email'), 200).toLowerCase()
  if (!isEmail(email)) return { ok: false, error: 'email' }
  const p = await getPayload({ config })
  const existing = await p.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
  if (!existing.docs.length) {
    await p.create({
      collection: 'subscribers',
      data: { email, locale: clean(fd.get('locale'), 5), consentAt: new Date().toISOString() },
      overrideAccess: true,
    })
  }
  return { ok: true }
}

export async function submit(_: FormState, fd: FormData): Promise<FormState> {
  if (isBot(fd)) return { ok: true }
  const kind = clean(fd.get('kind'), 20) as 'address' | 'pro' | 'correction' | 'feedback'
  if (!['address', 'pro', 'correction', 'feedback'].includes(kind)) return { ok: false, error: 'kind' }
  const subject = clean(fd.get('subject'), 200) || clean(fd.get('message'), 80)
  const email = clean(fd.get('email'), 200)
  if (!subject) return { ok: false, error: 'subject' }
  if (email && !isEmail(email)) return { ok: false, error: 'email' }
  if ((kind === 'pro' || kind === 'address') && !email && !clean(fd.get('phone'))) return { ok: false, error: 'contact' }
  const p = await getPayload({ config })
  await p.create({
    collection: 'submissions',
    data: {
      kind,
      status: 'new',
      subject,
      contactName: clean(fd.get('name'), 200),
      contactEmail: email || undefined,
      contactPhone: clean(fd.get('phone'), 40),
      sector: clean(fd.get('sector'), 120),
      wilaya: clean(fd.get('wilaya'), 120),
      message: clean(fd.get('message'), 5000),
      pageUrl: clean(fd.get('pageUrl'), 500),
      locale: clean(fd.get('locale'), 5),
    },
    overrideAccess: true,
  })
  return { ok: true }
}
