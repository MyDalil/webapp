'use client'

/**
 * Document choisi depuis une barre (accueil, « Demandez à DALIL ») : gardé en mémoire le temps
 * de la navigation vers /recherche, où il est lu. Rien n’est envoyé ni stocké.
 */
let pending: File | null = null
export const ACCEPT_DOC = '.pdf,.txt,.md,.csv'
export const setPendingDoc = (f: File | null) => void (pending = f)
export const takePendingDoc = () => {
  const f = pending
  pending = null
  return f
}
