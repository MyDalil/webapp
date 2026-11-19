import { describe, expect, it } from 'vitest'
import { qrMatrix, qrSvg } from './qr'

/** Motif de repérage 7×7 : contour sombre, anneau clair, carré sombre 3×3 au centre. */
function finderAt(m: boolean[][], top: number, left: number) {
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++) {
      const ring = r === 0 || r === 6 || c === 0 || c === 6
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
      if (m[top + r][left + c] !== (ring || core)) return false
    }
  return true
}

describe('QR du kit', () => {
  const url = 'https://www.mydalil.com/adresses/pharmacie-centrale-oran'
  const m = qrMatrix(url)
  it('taille conforme à une version QR (17 + 4 × version)', () => {
    expect(m.length).toBeGreaterThanOrEqual(21)
    expect((m.length - 17) % 4).toBe(0)
    expect(m.every((row) => row.length === m.length)).toBe(true)
  })
  it('trois motifs de repérage aux coins', () => {
    const n = m.length
    expect(finderAt(m, 0, 0)).toBe(true)
    expect(finderAt(m, 0, n - 7)).toBe(true)
    expect(finderAt(m, n - 7, 0)).toBe(true)
    expect(finderAt(m, n - 7, n - 7)).toBe(false)
  })
  it('motif de synchronisation alterné', () => {
    for (let i = 8; i < m.length - 8; i++) expect(m[6][i]).toBe(i % 2 === 0)
  })
  it('une adresse plus longue donne un QR plus grand', () => {
    expect(qrMatrix(`${url}?${'x'.repeat(200)}`).length).toBeGreaterThan(m.length)
  })
  it('SVG avec marge de 4 modules', () => {
    const svg = qrSvg(url)
    expect(svg).toContain(`viewBox="0 0 ${m.length + 8} ${m.length + 8}"`)
    expect(svg.startsWith('<svg')).toBe(true)
  })
})
