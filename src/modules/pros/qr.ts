import qrcode from 'qrcode-generator'

/**
 * QR code du kit « Vérifié sur DALIL » (encodeur `qrcode-generator`, sans dépendance).
 * Correction d’erreur M (15 %) : lisible imprimé, même un peu abîmé, sans alourdir le motif.
 */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M')
  qr.addData(text, 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
}

/** SVG net (un seul tracé), marge de 4 modules exigée par la norme. Couleurs de la maquette par défaut. */
export function qrSvg(text: string, opts: { size?: number; dark?: string; light?: string; margin?: number } = {}): string {
  const m = qrMatrix(text)
  const margin = opts.margin ?? 4
  const n = m.length + margin * 2
  const size = opts.size ?? n * 10
  let d = ''
  m.forEach((row, r) => row.forEach((dark, c) => dark && (d += `M${c + margin} ${r + margin}h1v1h-1z`)))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${opts.light ?? '#ffffff'}"/><path d="${d}" fill="${opts.dark ?? '#0b293b'}"/></svg>`
}
