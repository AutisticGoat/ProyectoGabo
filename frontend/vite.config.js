import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige /api/* → http://localhost/ProyectoGabo/php/*
      // Así React habla con el backend PHP sin problemas de CORS
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/ProyectoGabo/php'),
      },
    },
  },
})
