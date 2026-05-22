import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/predict': 'http://localhost:10000',
      '/convert-salary': 'http://localhost:10000',
      '/currencies': 'http://localhost:10000',
      '/upload-csv': 'http://localhost:10000',
      '/analytics': 'http://localhost:10000',
      '/health': 'http://localhost:10000'
    }
  }
})