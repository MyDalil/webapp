import { describe, expect, it } from 'vitest'
import { WILAYAS } from '@/platform/referentiel/catalog'
import { WILAYA_VARIANTS, placeWords, withinOneEdit } from '@/platform/referentiel/placeNames'
import { searchWords } from '@/platform/search/store'
import { detectPlace } from './place'

describe('variantes des noms de wilayas', () => {
  it('couvre exactement les 69 wilayas', () => {
    expect(Object.keys(WILAYA_VARIANTS).map(Number).sort((a, b) => a - b)).toEqual(WILAYAS.map((w) => w.code))
  })
  it.each([
    ['dentiste Béjaïa', '6'],
    ['dentiste bejaia', '6'],
    ['dentiste bgayet', '6'],
    ['hotel bougie', '6'],
    ['طبيب بجاية', '6'],
    ['pharmacie Algiers', '16'],
    ['pharmacie dzayer', '16'],
    ['صيدلية الجزائر', '16'],
    ['plombier Wahran', '31'],
    ['مطعم وهران', '31'],
    ['avocat Qacentina', '25'],
    ['محامي قسنطينة', '25'],
    ['garage Tizi-Ouzou', '15'],
    ['مستشفى تيزي وزو', '15'],
    ['hopital Setif', '19'],
    ['مستشفى سطيف', '19'],
  ])('« %s » → wilaya %s', (q, code) => {
    expect(detectPlace(q).wilaya).toBe(code)
  })
  it('garde le nom officiel comme libellé et retire le lieu de la recherche', () => {
    expect(detectPlace('dentiste à Wahran')).toMatchObject({ wilaya: '31', label: 'Oran', rest: 'dentiste' })
  })
  it('écriture arabe : hamza et ta marbouta ramenées à une forme', () => {
    expect(placeWords('أدرار')).toEqual(placeWords('ادرار'))
    expect(placeWords('سعيدة')).toEqual(placeWords('سعيده'))
  })
  it('lettres latines : mêmes mots que la recherche', () => {
    expect(placeWords('Hôpital, Tizi-Ouzou !')).toEqual(searchWords('Hôpital, Tizi-Ouzou !'))
  })
})

describe('fautes simples', () => {
  it('distance d’édition ≤ 1', () => {
    expect(withinOneEdit('constantin', 'constantine')).toBe(true)
    expect(withinOneEdit('tlemsen', 'tlemcen')).toBe(true)
    expect(withinOneEdit('tlemsenn', 'tlemcen')).toBe(false)
    expect(withinOneEdit('oran', 'oran')).toBe(true)
  })
  it('tolère une faute dans un nom de 5 lettres et plus', () => {
    expect(detectPlace('avocat constantin')).toMatchObject({ wilaya: '25', label: 'Constantine', rest: 'avocat' })
    expect(detectPlace('hotel tlemsen')).toMatchObject({ wilaya: '13', rest: 'hotel' })
    expect(detectPlace('pharmacie ghardaya')).toMatchObject({ wilaya: '47' })
  })
  it('ne devine pas un nom court mal écrit', () => {
    expect(detectPlace('dentiste orna').wilaya).toBeNull()
  })
})
