// MapLibre 6 charge son worker à côté de son propre fichier. Next le regroupe
// dans un chunk : le worker n'y est pas. On le sert depuis public/.
import { copyFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const dist = dirname(require.resolve('maplibre-gl/package.json'))
copyFileSync(join(dist, 'dist/maplibre-gl-worker.mjs'), 'public/maplibre-gl-worker.mjs')
