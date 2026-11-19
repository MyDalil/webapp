/** Pictogrammes en couleur de l’accueil équipe (traits simples, couleur portée par le pictogramme). */
const svg = (color: string, d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
export const IconImport = () => svg('#0f7b4f', <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 19h16" /></>)
export const IconShield = () => svg('#1d5fbf', <><path d="M12 3 5 6v6c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>)
export const IconHelp = () => svg('#b7791f', <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" /><path d="M12 17h.01" /></>)
export const IconCheck = () => svg('#7a3fb8', <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>)
