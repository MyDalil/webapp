import { revalidatePath } from 'next/cache'
import { LANGS_ALL } from './i18n'

/** Rafraîchit une page dans les trois langues (/fr/x, /en/x, /ar/x : chemins internes du segment [lang]). */
export function revalidateLangs(path: string, type?: 'layout' | 'page') {
  for (const l of LANGS_ALL) revalidatePath(`/${l}${path === '/' ? '' : path}`, type)
}
