/**
 * Lien direct vers la boîte de réception, selon l’adresse saisie (après l’envoi d’un code ou d’un lien).
 * Fournisseur inconnu : null — l’interface propose alors les messageries les plus courantes.
 */
type Box = { label: string; url: string }

const SEARCH = encodeURIComponent('from:mydalil.com')

const PROVIDERS: [RegExp, Box][] = [
  [/^(gmail|googlemail)\.com$/, { label: 'Gmail', url: `https://mail.google.com/mail/u/0/#search/${SEARCH}` }],
  [/^(outlook|hotmail|live|msn)\.[a-z.]+$/, { label: 'Outlook', url: 'https://outlook.live.com/mail/0/' }],
  [/^(yahoo|ymail)\.[a-z.]+$/, { label: 'Yahoo Mail', url: 'https://mail.yahoo.com/' }],
  [/^(icloud|me|mac)\.com$/, { label: 'iCloud Mail', url: 'https://www.icloud.com/mail' }],
  [/^(proton\.me|protonmail\.com|pm\.me)$/, { label: 'Proton Mail', url: 'https://mail.proton.me/' }],
  [/^(orange|wanadoo)\.fr$/, { label: 'Mail Orange', url: 'https://messagerie.orange.fr/' }],
  [/^free\.fr$/, { label: 'Free Webmail', url: 'https://webmail.free.fr/' }],
  [/^(sfr|neuf)\.fr$/, { label: 'SFR Mail', url: 'https://webmail.sfr.fr/' }],
  [/^laposte\.net$/, { label: 'La Poste Mail', url: 'https://www.laposte.net/accueil' }],
  [/^gmx\.[a-z.]+$/, { label: 'GMX', url: 'https://www.gmx.fr/' }],
  [/^(yandex\.[a-z.]+|ya\.ru)$/, { label: 'Yandex Mail', url: 'https://mail.yandex.com/' }],
]

export function mailboxOf(email: string): Box | null {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? ''
  return PROVIDERS.find(([re]) => re.test(domain))?.[1] ?? null
}

/** Messageries proposées quand le fournisseur n’est pas reconnu (adresse professionnelle, etc.). */
export const COMMON_BOXES: Box[] = [PROVIDERS[0][1], PROVIDERS[1][1], PROVIDERS[2][1], PROVIDERS[3][1]]
