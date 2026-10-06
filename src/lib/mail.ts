import 'server-only'
import { Resend } from 'resend'

/** Adresse d’envoi et de réponse de DALIL (domaine vérifié chez Resend). */
export const FROM = 'DALIL <salam@mydalil.com>'
export const TEAM = process.env.DALIL_TEAM_EMAIL || 'salam@mydalil.com'
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydalil.com'

const client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Gabarit sobre aux couleurs de la maquette (vert DALIL). Le contenu passé ici est déjà échappé. */
export function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#fbfaf7;font-family:Inter,Arial,sans-serif;color:#13201a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dce3de;border-radius:16px;padding:32px">
<tr><td style="font-weight:700;font-size:18px;color:#006b3c;padding-bottom:20px">DALIL</td></tr>
<tr><td style="font-size:22px;font-weight:700;line-height:1.3;padding-bottom:14px">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#3d4a43">${body}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${esc(cta.href)}" style="display:inline-block;background:#006b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${esc(cta.label)}</a></td></tr>` : ''}
<tr><td style="padding-top:28px;font-size:12px;color:#6b7770">DALIL — le guide de confiance pour explorer, vivre et avancer en Algérie.<br>Une question ? Répondez simplement à cet email.</td></tr>
</table></td></tr></table></body></html>`
}

/** Envoi best-effort : un email qui échoue ne bloque jamais le formulaire (l’envoi est journalisé sans contenu). */
export async function send(to: string, subject: string, html: string) {
  if (!client) return false
  try {
    const { error } = await client.emails.send({ from: FROM, to, replyTo: TEAM, subject, html })
    if (error) console.error('[mail] échec', subject, error.name)
    return !error
  } catch (e) {
    console.error('[mail] échec', subject, (e as Error).name)
    return false
  }
}
