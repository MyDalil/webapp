import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { Media } from './Media'
import { thumbHashDataUrl } from './thumbhash'

describe('aperçu flou (ThumbHash)', () => {
  it('calculé à l’envoi par la collection Media, converti en image data: légère', async () => {
    const file = await sharp({ create: { width: 1280, height: 853, channels: 3, background: '#2f7d5b' } }).jpeg().toBuffer()
    const hook = Media.hooks!.beforeChange!.at(-1)!
    const data = (await hook({ data: { alt: 'Jardin' }, req: { file: { data: file }, context: {} } } as never)) as { thumbhash?: string }
    expect(data.thumbhash).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(data.thumbhash!.length).toBeLessThanOrEqual(40)
    const url = thumbHashDataUrl(data.thumbhash)
    expect(url).toMatch(/^data:image\/png;base64,/)
    expect(url!.length).toBeLessThan(8000)
  })
  it('sans fichier ou fichier illisible : pas d’aperçu, pas d’erreur', async () => {
    const hook = Media.hooks!.beforeChange!.at(-1)!
    expect(await hook({ data: { alt: 'x' }, req: { context: {} } } as never)).toEqual({ alt: 'x' })
    expect(await hook({ data: { alt: 'x' }, req: { file: { data: Buffer.from('pas une image') }, context: {} } } as never)).toEqual({ alt: 'x' })
    expect(thumbHashDataUrl(null)).toBeNull()
    expect(thumbHashDataUrl('')).toBeNull()
  })
})
