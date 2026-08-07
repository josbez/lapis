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
  },
})
