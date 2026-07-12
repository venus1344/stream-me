import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/app': 'http://127.0.0.1:3333',
      '/api/restream': 'http://127.0.0.1:8099',
    },
  },
})
