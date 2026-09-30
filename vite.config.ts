import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 本機開發時，/api 轉給 `npx wrangler pages dev dist` (Cloudflare Pages Functions，預設 8788 埠)
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
