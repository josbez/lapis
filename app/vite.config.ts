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
    // jsdom mist een paar DOM-metingen-APIs die CodeMirror 6 zelf gebruikt
    // (zie src/test-setup.ts) — zonder deze stubs faalt de testrun soms
    // intermitterend op een onafgevangen fout uit een rAF-callback die pas
    // ná een test afgaat.
    setupFiles: ['src/test-setup.ts'],
    // @atomic-editor/editor@0.6.2 gebruikt extensieloze relatieve imports in
    // zijn ESM-build. Bundlers lossen dat op, Node's ESM-resolver niet. Door
    // het pakket te inlinen loopt het door Vite heen, net als in de app
    // (zelfde regel als spike/vite.config.ts).
    server: { deps: { inline: ['@atomic-editor/editor'] } },
  },
})
