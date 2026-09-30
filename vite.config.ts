import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 本機開發時，/api 轉給 `npx wrangler dev` (Cloudflare Worker，預設 8787 埠)
    proxy: {
      '/api': 'http://localhost:8787',
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
