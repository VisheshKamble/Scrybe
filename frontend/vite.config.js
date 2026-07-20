import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Inside the frontend container, "localhost" means the frontend
      // container itself -- the backend lives in a separate container,
      // reachable at its Docker Compose service name, "backend".
      '/api': 'http://backend:8000',
    },
  },
})
