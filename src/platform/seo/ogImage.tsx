import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { SITE } from '../site'

/** Aperçu de lien (WhatsApp, Telegram, réseaux) : 1200×630, couleurs de la maquette (mockup.css). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const C = { bg: '#fbfaf7', text: '#14201b', muted: '#69746f', green: '#006b3c', greenSoft: '#e5f4ec', navy: '#0b293b', line: '#dce3de' }

/** Marque DALIL : le pictogramme officiel du site (public/favicon.svg). */
const markReady = readFile(join(process.cwd(), 'public/favicon.svg'), 'base64').then((b) => `data:image/svg+xml;base64,${b}`).catch(() => null)

const font = (pkg: string, file: string) => readFile(join(process.cwd(), 'node_modules/@fontsource', pkg, 'files', file)).catch(() => null)
/** Polices déjà présentes dans le projet (@fontsource, format woff accepté par ImageResponse). */
const fontsReady = Promise.all([
  font('manrope', 'manrope-latin-800-normal.woff'),
  font('inter', 'inter-latin-500-normal.woff'),
  font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-600-normal.woff'),
]).then(([title, body, arabic]) => {
  const out: { name: string; data: Buffer; weight: 500 | 600 | 800; style: 'normal' }[] = []
  if (title) out.push({ name: 'Manrope', data: title, weight: 800, style: 'normal' })
  if (body) out.push({ name: 'Inter', data: body, weight: 500, style: 'normal' })
  if (arabic) out.push({ name: 'IBM Plex Sans Arabic', data: arabic, weight: 600, style: 'normal' })
  return out
})

/** Photo de la fiche convertie en JPEG (WebP non lu par ImageResponse) ; absente ou illisible → pas de photo. */
async function photoData(src: string | null | undefined): Promise<string | null> {
  if (!src) return null
  try {
    const url = /^https?:\/\//.test(src) ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).resize(500, 630, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer()
    return `data:image/jpeg;base64,${jpg.toString('base64')}`
  } catch {
    return null
  }
}

export type OgFiche = {
  /** Nom de la fiche. */
  title: string
  /** Catégorie, spécialité ou type (petite étiquette). */
  kicker?: string | null
  /** Commune, wilaya. */
  place?: string | null
  photo?: string | null
  rtl?: boolean
}

export async function ficheOgImage(f: OgFiche) {
  const [fonts, photo, mark] = await Promise.all([fontsReady, photoData(f.photo), markReady])
  const title = f.title.length > 70 ? `${f.title.slice(0, 68)}…` : f.title
  const family = 'Manrope, Inter, "IBM Plex Sans Arabic"'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: f.rtl ? 'row-reverse' : 'row', background: C.bg, fontFamily: family }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 64px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {mark && <img src={mark} width={48} height={48} alt="" />}
            <div style={{ fontSize: 30, fontWeight: 800, color: C.navy, letterSpacing: 2 }}>DALIL</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {f.kicker && (
              <div style={{ display: 'flex' }}>
                <div style={{ fontSize: 26, fontWeight: 500, color: C.green, background: C.greenSoft, borderRadius: 999, padding: '8px 20px' }}>{f.kicker}</div>
              </div>
            )}
            <div style={{ fontSize: title.length > 40 ? 58 : 70, fontWeight: 800, color: C.text, lineHeight: 1.08 }}>{title}</div>
            {f.place && <div style={{ fontSize: 30, fontWeight: 500, color: C.muted }}>{f.place}</div>}
          </div>
          <div style={{ display: 'flex', borderTop: `2px solid ${C.line}`, paddingTop: 22, fontSize: 24, fontWeight: 500, color: C.muted }}>mydalil.com</div>
        </div>
        {photo && <img src={photo} width={500} height={630} style={{ width: 500, height: 630, objectFit: 'cover' }} alt="" />}
      </div>
    ),
    { ...OG_SIZE, fonts },
  )
}
