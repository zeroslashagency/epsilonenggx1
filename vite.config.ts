import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/v2': {
        target: 'https://app.epsilonengg.in',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
