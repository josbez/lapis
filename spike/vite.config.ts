import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // @atomic-editor/editor@0.6.2 gebruikt extensieloze relatieve imports in
    // zijn ESM-build. Bundlers lossen dat op, Node's ESM-resolver niet. Door
    // het pakket te inlinen loopt het door Vite heen, net als in de app.
    server: { deps: { inline: ['@atomic-editor/editor'] } },
  },
})
