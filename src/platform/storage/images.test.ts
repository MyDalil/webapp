import { describe, expect, it } from 'vitest'
import { cleanDocument, cleanImage } from './images'

const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46]), // APP0 gardé
  Buffer.from([0xff, 0xe1, 0x00, 0x08]), Buffer.from('GPS!42'), // APP1 EXIF retiré
  Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]),
])

const chunk = (type: string, body: Buffer) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  return Buffer.concat([len, Buffer.from(type, 'ascii'), body, Buffer.alloc(4)])
}
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', Buffer.alloc(13)), chunk('eXIf', Buffer.from('GPS!42')), chunk('IDAT', Buffer.from('xx')), chunk('IEND', Buffer.alloc(0))])

describe('cleanImage', () => {
  it('retire l’EXIF d’un JPEG et garde l’image', () => {
    const r = cleanImage(jpeg)
    if ('error' in r) throw new Error(r.error)
    expect(r.mimetype).toBe('image/jpeg')
    expect(r.data.includes(Buffer.from('GPS!42'))).toBe(false)
    expect(r.data.subarray(-4)).toEqual(Buffer.from([0x11, 0x22, 0xff, 0xd9]))
  })
  it('retire les métadonnées d’un PNG', () => {
    const r = cleanImage(png)
    if ('error' in r) throw new Error(r.error)
    expect(r.data.includes(Buffer.from('GPS!42'))).toBe(false)
    expect(r.data.includes(Buffer.from('IDAT'))).toBe(true)
  })
  it('refuse un faux fichier image et un fichier trop lourd', () => {
    expect(cleanImage(Buffer.from('<script>alert(1)</script>'))).toEqual({ error: 'Format accepté : JPEG, PNG ou WebP.' })
    expect('error' in cleanImage(Buffer.alloc(5 * 1024 * 1024, 0xff))).toBe(true)
  })
  it('accepte un PDF comme pièce justificative, pas comme photo', () => {
    const pdf = Buffer.from('%PDF-1.7\n...')
    expect('error' in cleanImage(pdf)).toBe(true)
    expect(cleanDocument(pdf)).toMatchObject({ mimetype: 'application/pdf' })
  })
})
