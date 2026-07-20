import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/devtrack/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      ignored: ['**/node/**']
    },
    proxy: {
      '/devtrack/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/devtrack/mfa': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/devtrack/ws': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})