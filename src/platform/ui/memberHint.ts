/**
 * Indice de connexion d’un membre, lisible par la page (le cookie de session `payload-token` ne l’est pas).
 * But : coût minimal. Un visiteur sans compte ne déclenche plus aucun appel à /api/compte ni /api/favorites.
 * L’indice ne donne aucun droit : le serveur vérifie toujours la vraie session. Un indice périmé se corrige seul
 * (la session est absente → l’indice est effacé).
 */
export const MEMBER_HINT = 'dalil_m'
const CHECKED = 'dalil_compte_verifie'
const DAYS_30 = 60 * 60 * 24 * 30

/** En-tête Set-Cookie posé par le serveur à la connexion (même durée que la session des membres). */
export const memberHintSetCookie = (maxAge = DAYS_30) =>
  `${MEMBER_HINT}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

const browser = () => typeof document !== 'undefined'
export const hasMemberHint = () => browser() && document.cookie.split('; ').some((c) => c.startsWith(`${MEMBER_HINT}=`))
export function setMemberHint() {
  if (browser()) document.cookie = `${MEMBER_HINT}=1; Path=/; Max-Age=${DAYS_30}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}
export function clearMemberHint() {
  if (browser()) document.cookie = `${MEMBER_HINT}=; Path=/; Max-Age=0; SameSite=Lax`
}

export type AccountMember = { firstName?: string; kind?: string; verified?: boolean; gender?: string | null; wilaya?: number | null }
type Account = { member: AccountMember | null }
const NONE: Account = { member: null }
let pending: Promise<Account> | null = null
let pendingWithHint = false

/**
 * Compte du visiteur, une seule requête par page (partagée par l’en-tête, les boutons, les formulaires).
 * Sans indice : aucune requête — sauf une fois par navigateur, pour reconnaître un membre connecté avant
 * l’arrivée de l’indice (souvenir gardé dans le stockage local).
 */
export function getAccount(): Promise<Account> {
  if (!browser()) return Promise.resolve(NONE)
  const hint = hasMemberHint()
  let checked = true
  try { checked = localStorage.getItem(CHECKED) === '1' } catch {}
  if (!hint && checked) return Promise.resolve(NONE)
  // Un indice apparu depuis la dernière requête (connexion) : nouvelle lecture.
  if (pending && (pendingWithHint || !hint)) return pending
  pendingWithHint = hint
  pending = fetch('/api/compte', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : NONE))
    .then((j: Account) => {
      try { localStorage.setItem(CHECKED, '1') } catch {}
      if (j?.member) setMemberHint()
      else clearMemberHint()
      return j?.member ? j : NONE
    })
    .catch(() => NONE)
  return pending
}
