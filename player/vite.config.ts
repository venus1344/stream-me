import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': 'http://localhost:8001',
      '/api/servers': 'http://localhost:8001',
      '/api/restream': 'http://localhost:8099',
      '/api/clips': 'http://localhost:8099',
      '/app': 'http://localhost:3333',
    },
  },
})
