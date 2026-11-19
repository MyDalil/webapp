import { esc } from '@/platform/mail'

/**
 * Page de retour après paiement (Chargily, Stripe) : simple, aux couleurs du gabarit des emails DALIL,
 * sans information de paiement (l’activation suit le webhook signé, jamais ce retour). Non indexée.
 */
type Lang = 'fr' | 'en' | 'ar'
type State = 'ok' | 'echec' | 'annule'
const TEXT: Record<Lang, Record<State, [string, string]> & { back: string }> = {
  fr: {
    ok: ['Paiement reçu, activation en cours', 'Merci. Votre formule s’active dès la confirmation du paiement, en général en quelques instants. Un reçu vous est envoyé par email.'],
    echec: ['Paiement non abouti', 'Aucun montant n’a été validé. Vous pouvez réessayer, ou régler par BaridiMob, CCP ou virement et envoyer votre reçu.'],
    annule: ['Paiement annulé', 'Aucun montant n’a été prélevé. Vous pouvez reprendre le paiement depuis votre espace pro.'],
    back: 'Retour à mon espace pro',
  },
  en: {
    ok: ['Payment received, activation in progress', 'Thank you. Your plan is activated as soon as the payment is confirmed, usually within moments. A receipt is sent to you by email.'],
    echec: ['Payment not completed', 'No amount was taken. You can try again, or pay by BaridiMob, CCP or bank transfer and send your receipt.'],
    annule: ['Payment cancelled', 'No amount was taken. You can resume the payment from your pro space.'],
    back: 'Back to my pro space',
  },
  ar: {
    ok: ['تم استلام الدفع، التفعيل جارٍ', 'شكرًا. تُفعَّل باقتكم فور تأكيد الدفع، عادةً خلال لحظات. يصلكم إيصال عبر البريد الإلكتروني.'],
    echec: ['لم يكتمل الدفع', 'لم يُقتطع أي مبلغ. يمكنكم المحاولة مجددًا، أو الدفع عبر بريدي موب أو الحساب البريدي الجاري أو التحويل وإرسال الإيصال.'],
    annule: ['تم إلغاء الدفع', 'لم يُقتطع أي مبلغ. يمكنكم استئناف الدفع من فضائكم المهني.'],
    back: 'العودة إلى فضائي المهني',
  },
}

export function paymentReturnHtml(params: { lang?: string | null; etat?: string | null }, site: string) {
  const lang: Lang = params.lang === 'en' || params.lang === 'ar' ? params.lang : 'fr'
  const state: State = params.etat === 'echec' || params.etat === 'annule' ? params.etat : 'ok'
  const t = TEXT[lang]
  const [title, body] = t[state]
  const href = `${site}${lang === 'fr' ? '' : `/${lang}`}/espace-pro`
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} — DALIL</title></head>
<body style="margin:0;background:#fbfaf7;font-family:Inter,Arial,sans-serif;color:#13201a">
<main style="max-width:560px;margin:48px auto;padding:0 16px"><div style="background:#fff;border:1px solid #dce3de;border-radius:16px;padding:32px">
<p style="margin:0 0 20px;font-weight:700;font-size:18px;color:#006b3c">DALIL</p>
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3">${esc(title)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#3d4a43">${esc(body)}</p>
<p style="margin:24px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#006b3c;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${esc(t.back)}</a></p>
</div></main></body></html>`
}
