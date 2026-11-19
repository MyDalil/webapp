import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { Media } from './Media'

/**
 * Les photos de l’admin passent par sharp dans Payload (resizeOptions présents → toujours réencodées)
 * sans `withMetadata` : EXIF et position GPS sont retirés.
 */
describe('photos : métadonnées retirées', () => {
  it('la collection Media ne garde pas les métadonnées et réencode toujours', () => {
    const up = Media.upload as { withMetadata?: unknown; resizeOptions?: unknown }
    expect(up.withMetadata).toBeUndefined()
    expect(up.resizeOptions).toBeTruthy()
  })
  it('sharp sans withMetadata retire EXIF et GPS (même chaîne que Payload)', async () => {
    const withGps = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#c33' } })
      .jpeg()
      .withExifMerge({ IFD0: { Make: 'Telephone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '36/1 45/1 0/1' } })
      .toBuffer()
    expect((await sharp(withGps).metadata()).exif).toBeTruthy()
    const out = await sharp(withGps).rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).toBuffer()
    const meta = await sharp(out).metadata()
    expect(meta.exif).toBeUndefined()
    expect(out.includes(Buffer.from('Telephone'))).toBe(false)
  })
})
