/* eslint-env node */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  base: process.env.GITHUB_ACTIONS ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''}/` : '/'
})