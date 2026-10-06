/** Aide sous les champs latitude / longitude dans /admin. */
export function CoordsHelp() {
  return (
    <p style={{ margin: '-8px 0 24px', color: 'var(--theme-elevation-500)', fontSize: 13, lineHeight: 1.5 }}>
      Pour trouver les coordonnées : sur Google Maps, clic droit sur le lieu, puis cliquez sur les chiffres affichés
      (ex. <code>36.7528, 3.0420</code>) — le premier est la latitude, le second la longitude. Sans coordonnées, la
      carte place l’adresse au centre de sa ville, signalée comme position approximative.
    </p>
  )
}
