import { Resend } from 'resend'

/** Adresse d’envoi et de réponse de DALIL (domaine vérifié chez Resend ; salam@ est redirigée vers la boîte de l’équipe). */
export const FROM = 'DALIL <salam@mydalil.com>'
export const TEAM = process.env.DALIL_TEAM_EMAIL || 'salam@mydalil.com'
/** Les liens des emails pointent vers l’environnement qui les envoie (preview → preview.mydalil.com). */
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_ENV === 'preview' ? 'https://preview.mydalil.com' : 'https://www.mydalil.com')

const client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Texte saisi (ex. message de l’équipe) → paragraphes HTML échappés. */
export const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

type Cta = { label: string; href: string }

/** Gabarit sobre aux couleurs de la maquette (vert DALIL). `body` doit déjà être échappé. */
export function layout(title: string, body: string, cta?: Cta, footer?: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#fbfaf7;font-family:Inter,Arial,sans-serif;color:#13201a">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #dce3de;border-radius:16px;padding:32px">
<tr><td style="font-weight:700;font-size:18px;color:#006b3c;padding-bottom:20px">DALIL</td></tr>
<tr><td style="font-size:22px;font-weight:700;line-height:1.3;padding-bottom:14px">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#3d4a43">${body}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${esc(cta.href)}" style="display:inline-block;background:#006b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${esc(cta.label)}</a></td></tr>` : ''}
<tr><td style="padding-top:28px;font-size:12px;line-height:1.5;color:#6b7770">DALIL — le guide de confiance pour explorer, vivre et avancer en Algérie.<br>${footer ?? 'Une question ? Répondez simplement à cet email.'}</td></tr>
</table></td></tr></table></body></html>`
}

type Options = { headers?: Record<string, string> }

/** Envoi best-effort : un email qui échoue ne bloque jamais l’action (journal sans contenu ni destinataire). */
export async function send(to: string, subject: string, html: string, opts: Options = {}) {
  if (!client) return false
  try {
    const { error } = await client.emails.send({ from: FROM, to, replyTo: TEAM, subject, html, headers: opts.headers })
    if (error) console.error('[mail] échec', subject, error.name)
    return !error
  } catch (e) {
    console.error('[mail] échec', subject, (e as Error).name)
    return false
  }
}

/** Envoi groupé (newsletter) : 100 emails max par appel Resend. Retourne le nombre d’envois acceptés. */
export async function sendBatch(messages: { to: string; subject: string; html: string; headers?: Record<string, string> }[]) {
  if (!client) return 0
  let ok = 0
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ from: FROM, replyTo: TEAM, ...m }))
    try {
      const { data, error } = await client.batch.send(chunk)
      if (error) console.error('[mail] lot refusé', error.name)
      else ok += data?.data?.length ?? chunk.length
    } catch (e) {
      console.error('[mail] lot refusé', (e as Error).name)
    }
  }
  return ok
}

/** Lien et en-têtes de désinscription en un clic (RFC 8058, exigés par Gmail et Yahoo pour les envois groupés). */
export function unsubscribe(token: string) {
  const url = `${SITE}/api/subscribers/unsubscribe?token=${token}`
  return {
    url,
    footer: `Vous recevez cet email car vous êtes inscrit aux nouvelles de DALIL. <a href="${SITE}/newsletter/desinscription?token=${token}" style="color:#6b7770">Se désinscrire</a>.`,
    headers: { 'List-Unsubscribe': `<${url}>, <mailto:${TEAM}?subject=desinscription>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  }
}
