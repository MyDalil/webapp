import 'server-only'
import { getControls } from '@/platform/controls/Controls'
import { payload } from '@/platform/http'
import { botToken, telegramApi } from './send'

export type NotifyButton = { text: string; data: string }

/**
 * Prévient Rad et Saïd (comptes patron/admin reliés à Telegram). Ne lève jamais d’erreur.
 * Boutons : `data` doit être signé (`signCallback` de ./callback) ; une donnée de plus de 64 octets est écartée.
 * Silencieux si le jeton manque, si Telegram est désactivé ou si tout est coupé (Commandes).
 */
export async function notifyStaff(text: string, opts?: { actionId?: string; buttons?: NotifyButton[][] }): Promise<void> {
  try {
    if (!botToken()) return
    const p = await payload()
    const c = await getControls(p)
    if (c.killSwitch === 'cut' || c.telegramEnabled === false) return
    const r = await p.find({ collection: 'users', where: { and: [{ role: { in: ['patron', 'admin'] } }, { telegramId: { exists: true } }] }, limit: 10, depth: 0, overrideAccess: true })
    const ids = [...new Set(r.docs.map((d) => String((d as { telegramId?: string | null }).telegramId ?? '').trim()).filter(Boolean))]
    if (!ids.length) return
    const rows = (opts?.buttons ?? []).map((row) => row.filter((b) => b.text && Buffer.byteLength(b.data) <= 64).map((b) => ({ text: b.text.slice(0, 40), callback_data: b.data }))).filter((row) => row.length)
    const body = `${text}${opts?.actionId ? `\n\nRéf. ${opts.actionId}` : ''}`.slice(0, 4000)
    await Promise.all(ids.map((chat_id) => telegramApi('sendMessage', { chat_id, text: body, disable_web_page_preview: true, ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}) }).catch(() => null)))
  } catch {
    // Une notification ne doit jamais faire échouer l’action qui l’a déclenchée.
  }
}
