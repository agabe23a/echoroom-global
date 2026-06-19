import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EchoRoom',
        short_name: 'EchoRoom',
        description: 'The Sanctuary.',
        theme_color: '#10172A',
        background_color: '#10172A',
        display: 'standalone'
      }
    })
  ]
})