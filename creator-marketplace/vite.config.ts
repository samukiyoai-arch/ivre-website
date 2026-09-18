import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { assetsInlineLimit: 100000 },
  server: { host: '127.0.0.1', port: 4180 },
})
