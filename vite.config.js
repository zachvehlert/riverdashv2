import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/noaa': {
        target: 'https://api.water.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/noaa/, '/nwps/v1'),
      },
      '/api/usgs': {
        target: 'https://waterservices.usgs.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/usgs/, '/nwis'),
      },
    },
  },
})
