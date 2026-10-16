'use client'

import { useDocumentInfo } from '@payloadcms/ui'

/** Lien de consultation d’une pièce justificative (réservé à l’équipe), dans /admin. */
export function DocumentLink() {
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <p style={{ margin: '0 0 24px', fontSize: 14 }}>
      <a href={`/api/equipe/pieces/${id}`} target="_blank" rel="noopener noreferrer">
        Ouvrir la pièce
      </a>{' '}
      — vérifiez-la, cochez la vérification sur la fiche du prestataire : la pièce est alors supprimée automatiquement.
    </p>
  )
}
