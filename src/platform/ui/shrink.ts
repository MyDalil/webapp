'use client'

/**
 * Réduit une photo dans le navigateur avant l’envoi (2000 px max, JPEG) : envoi plus rapide sur mobile,
 * sous le plafond de 4 Mo, et métadonnées (position GPS…) retirées par le réencodage. Un PDF est envoyé tel quel.
 */
export async function shrinkImage(file: File, max = 2000, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality))
  } catch {
    return file
  }
}
