import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { kitTarget, qrSvg } from '@/modules/pros'
import { fail } from '@/platform/http'
import { SITE } from '@/platform/site'

/**
 * Kit « Vérifié sur DALIL » (gratuit, fiches réellement vérifiées seulement, sinon 404) :
 * `?format=qr` → QR vers la fiche (PNG, ou SVG avec `&type=svg`) ; `?format=visuel` → image 1080×1350 pour Instagram/Facebook.
 */
type Ctx = { params: Promise<{ collection: string; slug: string }> }

// Couleurs de la maquette (src/styles/mockup.css, thème clair).
const C = { bg: '#fbfaf7', surface: '#ffffff', text: '#14201b', muted: '#69746f', line: '#dce3de', green: '#006b3c', greenSoft: '#e5f4ec', navy: '#0b293b' }

export async function GET(req: Request, { params }: Ctx) {
  const { collection, slug } = await params
  const target = await kitTarget(collection, slug).catch(() => null)
  if (!target) return fail('Kit réservé aux fiches vérifiées par DALIL.', 404)
  const url = `${SITE}${target.path}`
  const q = new URL(req.url).searchParams
  const format = q.get('format') ?? 'qr'
  const headers = { 'cache-control': 'public, max-age=3600', 'content-disposition': `inline; filename="dalil-${slug}` }
  if (format === 'qr') {
    const svg = qrSvg(url, { size: 1024 })
    if (q.get('type') === 'svg') return new Response(svg, { headers: { ...headers, 'content-type': 'image/svg+xml', 'content-disposition': `${headers['content-disposition']}-qr.svg"` } })
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    return new Response(new Uint8Array(png), { headers: { ...headers, 'content-type': 'image/png', 'content-disposition': `${headers['content-disposition']}-qr.png"` } })
  }
  if (format !== 'visuel') return fail('Format inconnu : qr ou visuel.', 400)
  const qr = `data:image/svg+xml;base64,${Buffer.from(qrSvg(url, { size: 520, margin: 2 })).toString('base64')}`
  const meta = [target.category, target.city].filter(Boolean).join(' · ')
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, padding: 88, color: C.text }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: C.navy, letterSpacing: 4 }}>DALIL</div>
          <div style={{ display: 'flex', alignItems: 'center', background: C.greenSoft, color: C.green, borderRadius: 999, padding: '14px 28px', fontSize: 30, fontWeight: 700 }}>Vérifié sur DALIL</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 96 }}>
          <div style={{ display: 'flex', fontSize: target.name.length > 32 ? 64 : 80, fontWeight: 700, lineHeight: 1.1, color: C.navy }}>{target.name}</div>
          {meta && <div style={{ display: 'flex', fontSize: 38, color: C.muted, marginTop: 28 }}>{meta}</div>}
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', background: C.surface, border: `2px solid ${C.line}`, borderRadius: 32, padding: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={qr} width={520} height={520} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: C.green }}>Retrouvez-nous sur DALIL</div>
          <div style={{ display: 'flex', fontSize: 30, color: C.muted, marginTop: 16 }}>{url.replace(/^https?:\/\//, '')}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { 'cache-control': 'public, max-age=3600' } },
  )
}
