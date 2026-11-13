import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Any request starting with /api is forwarded to the Node backend
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
