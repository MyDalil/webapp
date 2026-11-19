/** Règles du texte alternatif généré (pures, testées). */
export const ALT_MAX = 125

/** Une photo « sans texte alternatif » : vide, ou simple reprise du nom du fichier. */
export function needsAlt(doc: { alt?: string | null; filename?: string | null }) {
  const alt = (doc.alt ?? '').trim().toLowerCase()
  if (!alt) return true
  const file = (doc.filename ?? '').trim().toLowerCase()
  return !!file && (alt === file || alt === file.replace(/\.[a-z0-9]+$/, ''))
}

/** Une phrase, sans guillemets ni retour à la ligne, coupée proprement à 125 caractères. */
export function clampAlt(text: string) {
  const t = text.replace(/\s+/g, ' ').replace(/^["«»“”\s]+|["«»“”\s]+$/g, '').trim()
  if (t.length <= ALT_MAX) return t
  const cut = t.slice(0, ALT_MAX - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[,;:.\s]+$/, '')}…`
}

export const altPrompt = (context?: string) =>
  `Écris en français le texte alternatif de cette photo : une seule phrase descriptive de ${ALT_MAX} caractères au plus, sans « photo de » ni « image de ». Décris seulement ce qui est visible. ${context ? `Lieu indiqué par l’équipe : « ${context.slice(0, 120)} » (tu peux le citer).` : 'Ne cite aucun nom de lieu, de ville, de personne ni de marque.'} Réponds uniquement par la phrase.`
