import path from 'path'
import { defineConfig } from 'vitest/config'

// Mêmes alias que le site (`@/…` = src) pour tester les modules tels qu’ils sont importés.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@payload-config': path.resolve(__dirname, 'src/payload.config.ts') } },
  test: { include: ['src/**/*.test.ts'] },
})
