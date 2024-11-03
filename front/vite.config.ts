import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 'process.env.VITE_API_URL': JSON.stringify(import.meta.env?.VITE_API_URL || 'http://localhost:8989/'),
  },
  resolve: {
    alias: {
      '@components': '/src/components',
      '@ui': '/src/components/ui',
      '@front': '/',
      '@': '/src',
    },
  },
  // envDir: '.',
})
