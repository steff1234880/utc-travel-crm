import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback-plugin',
    closeBundle() {
      const distDir = path.resolve('dist')
      const indexPath = path.join(distDir, 'index.html')
      if (!fs.existsSync(indexPath)) return

      const indexHtml = fs.readFileSync(indexPath, 'utf-8')

      // 1. Generate 404.html (standard fallback for static hosts)
      fs.writeFileSync(path.join(distDir, '404.html'), indexHtml)

      // 2. Generate physical directory fallbacks for key routes
      const routes = [
        'login',
        'admin',
        'admin/login',
        'crm/login',
        'setup-admin',
        'about',
        'contact',
        'packages',
        'destinations',
        'blog',
      ]

      for (const route of routes) {
        const routeDir = path.join(distDir, route)
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true })
        }
        fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spaFallbackPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

