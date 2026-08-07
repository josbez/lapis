import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // Andere poort dan spike/ (1420), zodat beide dev-servers tegelijk kunnen
  // draaien zonder conflict.
  server: { port: 1421, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // @atomic-editor/editor@0.6.2 gebruikt extensieloze relatieve imports in
    // zijn ESM-build. Bundlers lossen dat op, Node's ESM-resolver niet. Door
    // het pakket te inlinen loopt het door Vite heen, net als in de app
    // (zelfde regel als spike/vite.config.ts).
    server: { deps: { inline: ['@atomic-editor/editor'] } },
  },
})
