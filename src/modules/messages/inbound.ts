/**
 * Boîte unique : emails reçus (Resend Inbound) et réponses de l’équipe. Logique pure, testée.
 * Aucun accusé de réception automatique : une réponse automatique vers une adresse qui renvoie vers la boîte
 * crée une boucle. Les emails venus de notre propre domaine sont ignorés pour la même raison.
 */
export const OWN_DOMAIN = 'mydalil.com'
export const MAX_TEXT = 20_000

export type ReceivedEmail = {
  id: string
  message_id?: string | null
  from: string
  to?: string[] | null
  subject?: string | null
  text?: string | null
  html?: string | null
  created_at?: string | null
  attachments?: Array<{ filename?: string | null; size?: number | null; content_type?: string | null }> | null
}

export type ThreadEntry = { at: string; by: string; text: string; delivered: boolean }

/** « Nom <adresse@x> » → adresse en minuscules ; null si absente. */
export function addressOf(from: string): string | null {
  const m = from.match(/<([^>]+)>/)
  const a = (m ? m[1] : from).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a) ? a : null
}

const domainOf = (addr: string) => addr.split('@')[1] ?? ''
export const isOwnDomain = (addr: string) => domainOf(addr) === OWN_DOMAIN || domainOf(addr).endsWith(`.${OWN_DOMAIN}`)

/** Texte lisible d’un email : la version texte, sinon le HTML sans balises (jamais de HTML stocké ni affiché). */
export function plainText(e: Pick<ReceivedEmail, 'text' | 'html'>): string {
  const raw = e.text?.trim() || (e.html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  return raw.replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT)
}

/** Email reçu → demande « email », ou la raison de l’ignorer. */
export function inboundToSubmission(e: ReceivedEmail): { skip: string } | { data: Record<string, unknown> } {
  const from = addressOf(e.from)
  if (!from) return { skip: 'expéditeur illisible' }
  if (isOwnDomain(from)) return { skip: 'expéditeur du domaine DALIL (boucle évitée)' }
  return {
    data: {
      kind: 'email',
      status: 'new',
      subject: (e.subject?.trim() || '(sans objet)').slice(0, 200),
      email: from,
      externalId: e.message_id || e.id,
      data: {
        from: e.from.slice(0, 200),
        to: (e.to ?? []).slice(0, 10),
        receivedAt: e.created_at ?? null,
        text: plainText(e),
        attachments: (e.attachments ?? []).slice(0, 20).map((a) => ({ filename: a.filename ?? null, size: a.size ?? null, type: a.content_type ?? null })),
        resendId: e.id,
      },
    },
  }
}

/** Ajoute une réponse au fil (le plus récent en dernier, 50 au plus). */
export function appendThread(thread: unknown, entry: ThreadEntry): ThreadEntry[] {
  const list = Array.isArray(thread) ? (thread as ThreadEntry[]) : []
  return [...list, entry].slice(-50)
}

/** Objet de la réponse : « Re : » une seule fois. */
export const replySubject = (subject: string) => (/^\s*re\s*:/i.test(subject) ? subject : `Re : ${subject}`).slice(0, 200)
