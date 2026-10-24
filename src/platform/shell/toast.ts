'use client'

/** Affiche le toast global de la maquette (voir Toast.tsx). */
export function toast(message: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dalil:toast', { detail: message }))
}
