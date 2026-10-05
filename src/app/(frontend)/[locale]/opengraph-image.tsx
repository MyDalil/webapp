import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'DALIL — le guide de l’Algérie'

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f6f3ec', padding: 80, color: '#15191c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: '#0f4c5c', display: 'flex' }} />
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 4 }}>DALIL</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 600 }}>L’Algérie, comme on la vit vraiment.</div>
          <div style={{ fontSize: 30, marginTop: 24, color: '#3c4348' }}>Adresses vérifiées · Démarches · Vie quotidienne</div>
        </div>
        <div style={{ height: 8, width: 160, background: '#b0532c' }} />
      </div>
    ),
    size,
  )
}
