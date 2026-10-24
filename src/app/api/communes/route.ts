import { NextResponse } from 'next/server'
import { communesOf } from '@/platform/referentiel/communes'

/** Communes d’une wilaya (référentiel ouvert, mis en cache). */
export function GET(req: Request) {
  const wilaya = Number(new URL(req.url).searchParams.get('wilaya'))
  const communes = wilaya ? communesOf(wilaya).map(({ id, name, ar }) => ({ id, name, ar })) : []
  return NextResponse.json({ communes }, { headers: { 'cache-control': 'public, max-age=86400' } })
}
