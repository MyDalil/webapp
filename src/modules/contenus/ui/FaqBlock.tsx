import { Icon } from '@/platform/ui/Icon'
import { faqJsonLd, faqsFor, type Faq } from '../faqs'

type Lang = 'fr' | 'en' | 'ar'
const TITLE: Record<Lang, string> = { fr: 'Questions fréquentes', en: 'Frequently asked questions', ar: 'أسئلة شائعة' }
const LANGS: Lang[] = ['fr', 'en', 'ar']

function Variant({ faqs, lang, shownFor, ld }: { faqs: Faq[]; lang: Lang; shownFor?: Lang[]; ld: string | null }) {
  const id = `faq-titre-${lang}`
  return (
    <section
      className="section container sr-group faq-block"
      aria-labelledby={id}
      lang={shownFor ? lang : undefined}
      data-lang-only={shownFor?.join(' ')}
    >
      <h2 id={id}>{TITLE[lang]}</h2>
      <ul className="sr-list">
        {faqs.map((f) => (
          <li key={f.id}>
            <details>
              <summary className="sr-row">
                <span className="sr-icon" aria-hidden="true">
                  <Icon name="list" />
                </span>
                <span className="sr-text">
                  <b>{f.question}</b>
                </span>
                <span />
                <span className="sr-chev" aria-hidden="true">›</span>
              </summary>
              <p className="sr-note faq-answer">{f.answer}</p>
            </details>
          </li>
        ))}
      </ul>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
    </section>
  )
}

/**
 * Bloc FAQ en bas d’une page de liste : accordéon natif (`details`/`summary`, clavier et lecteur d’écran sans script),
 * styles de la liste de recherche. Aucune question publiée pour ce chemin → rien n’est rendu, ni bloc ni balisage.
 *
 * `lang` connu (recommandé) : une seule version, balisage schema.org dans la langue de la page.
 * `lang` absent : les trois versions sont rendues et la feuille de style n’affiche que celle de `<html lang>`
 * (une langue sans question publiée retombe sur le français). Balisage schema.org : français seulement.
 */
export async function FaqBlock({ path, lang }: { path: string; lang?: Lang }) {
  if (lang) {
    const faqs = await faqsFor(path, lang)
    if (!faqs.length) return null
    return <Variant faqs={faqs} lang={lang} ld={faqJsonLd(faqs)} />
  }
  const sets = await Promise.all(LANGS.map((l) => faqsFor(path, l)))
  const byLang = Object.fromEntries(LANGS.map((l, i) => [l, sets[i]])) as Record<Lang, Faq[]>
  if (!byLang.fr.length && !byLang.en.length && !byLang.ar.length) return null
  // Langue → version affichée : la sienne si elle a des questions, sinon le français.
  const source = (l: Lang): Lang => (byLang[l].length ? l : 'fr')
  const variants = LANGS.filter((v) => byLang[v].length).map((v) => ({ v, shownFor: LANGS.filter((l) => source(l) === v) }))
  return (
    <>
      {variants.map(({ v, shownFor }) => (
        <Variant key={v} faqs={byLang[v]} lang={v} shownFor={shownFor} ld={v === 'fr' ? faqJsonLd(byLang.fr) : null} />
      ))}
    </>
  )
}
