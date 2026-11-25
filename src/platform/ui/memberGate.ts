'use client'

import { openLogin } from '@/platform/shell/LoginDialog'
import { getAccount } from './memberHint'

/**
 * Règle de Rad (25/11/2026) : tout se consulte sans compte ; toute action (envoyer, déposer, demander, proposer) exige un compte connecté.
 * `requireMember()` : vrai pour un membre connecté ; sinon ouvre la fenêtre de connexion (retour sur la page ensuite) et renvoie faux.
 * Le serveur vérifie toujours la vraie session (401) : ce contrôle évite seulement de remplir un formulaire pour rien.
 */
export async function requireMember(): Promise<boolean> {
  const { member } = await getAccount()
  if (!member) openLogin()
  return Boolean(member)
}

let asked = false
/** `onFocusCapture` d’un formulaire réservé aux membres : invite un visiteur à se connecter dès le premier champ (une fois par page). */
export function gateFocus() {
  if (asked) return
  asked = true
  void requireMember()
}
