import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

process.on('SIGINT', () => process.exit(0));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  appType: 'spa',
})
