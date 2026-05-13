import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Пропускаем multipart/form-data без изменений
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Не меняем Content-Type для multipart
          })
        }
      },
    },
  },
})
