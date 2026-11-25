import { describe, expect, it } from 'vitest'
import { smallPhoto, tilePhoto, wikiPhoto } from './photos'

const wiki = (w: number, host = 'upload') => `https://${host}.wikimedia.org/wikipedia/commons/thumb/a/ab/Casbah_(Alger).jpg/${w}px-Casbah_(Alger).jpg`

describe('tilePhoto', () => {
  it('ramène une couverture Wikimedia de 1920 px à 960 px', () => expect(tilePhoto(wiki(1920))).toBe(wiki(960)))
  it('ramène aussi 1280 px à 960 px, sur thumb.wikimedia.org compris', () => expect(tilePhoto(wiki(1280, 'thumb'))).toBe(wiki(960, 'thumb')))
  it('n’agrandit jamais une photo plus petite', () => {
    expect(tilePhoto(wiki(960))).toBe(wiki(960))
    expect(tilePhoto(wiki(640))).toBe(wiki(640))
  })
  it('laisse une adresse Wikimedia sans largeur telle quelle', () => {
    const original = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Casbah.jpg'
    expect(tilePhoto(original)).toBe(original)
  })
  it('garde le petit format des photos locales', () => {
    expect(tilePhoto('/images/photos/casbah.webp')).toBe('/images/photos/sm/casbah.webp')
    expect(tilePhoto('/images/photos/casbah.webp')).toBe(smallPhoto('/images/photos/casbah.webp'))
    expect(tilePhoto('/images/algeria/alger.webp')).toBe('/images/algeria/alger.webp')
  })
  it('ne touche pas aux photos Media (Vercel Blob), même avec « 1920px- » dans le nom', () => {
    const blob = 'https://abc.public.blob.vercel-storage.com/1920px-facade-1920x1080.webp'
    expect(tilePhoto(blob)).toBe(blob)
  })
  it('rend undefined sans photo', () => {
    expect(tilePhoto(null)).toBeUndefined()
    expect(tilePhoto(undefined)).toBeUndefined()
  })
})

describe('wikiPhoto', () => {
  it('ne change pas une photo locale (seul tilePhoto passe au petit format)', () => expect(wikiPhoto('/images/photos/casbah.webp')).toBe('/images/photos/casbah.webp'))
})
