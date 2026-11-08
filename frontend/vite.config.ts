import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

const proxy = {
  '/api': { target: backend, changeOrigin: true },
  '/healthz': { target: backend, changeOrigin: true, rewrite: () => '/' },
  '/static_images': { target: backend, changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
})
