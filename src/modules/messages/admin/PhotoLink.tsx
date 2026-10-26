'use client'

import { useDocumentInfo } from '@payloadcms/ui'

/** Lien de consultation d’une photo proposée (réservé à l’équipe), dans /admin. */
export function PhotoLink() {
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <p style={{ margin: '0 0 24px', fontSize: 14 }}>
      <a href={`/api/equipe/photos-proposees/${id}`} target="_blank" rel="noopener noreferrer">
        Ouvrir la photo
      </a>{' '}
      — si elle est retenue, ajoutez-la dans Photos avec le crédit « auteur · CC BY 4.0 », puis rattachez-la à la fiche.
    </p>
  )
}
