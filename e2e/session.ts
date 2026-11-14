import { expect, type APIRequestContext } from '@playwright/test'

/**
 * Connexion sûre pour les tests en parallèle. Payload ajoute chaque session au compte en relisant puis réécrivant
 * la liste : deux connexions simultanées au même compte peuvent effacer l’une des deux sessions. On vérifie donc
 * que la session existe (/api/users/me) et on se reconnecte sinon.
 */
export async function signIn(r: APIRequestContext, who: { email: string; password: string }) {
  for (let i = 0; i < 4; i++) {
    const res = await r.post('/api/users/login', { data: { email: who.email, password: who.password } })
    expect(res.ok(), `connexion ${who.email}`).toBe(true)
    await new Promise((ok) => setTimeout(ok, 150 + i * 200))
    const me = (await (await r.get('/api/users/me')).json().catch(() => ({}))) as { user?: unknown }
    if (me.user) return
  }
  throw new Error(`session de ${who.email} perdue quatre fois de suite`)
}
