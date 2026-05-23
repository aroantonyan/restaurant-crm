import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `/api/*` is regular REST; `/hubs/*` is SignalR (WebSocket).
// `ws: true` is required on the hubs entry so Vite forwards the WebSocket upgrade.
const proxy = {
  '/api': {
    target: 'http://localhost:5293',
    changeOrigin: true,
  },
  '/hubs': {
    target: 'http://localhost:5293',
    changeOrigin: true,
    ws: true,
  },
}

const allowedHosts = ['.ngrok-free.app', '.ngrok.io', '.ngrok.app']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts,
    proxy,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts,
    proxy,
  },
})
