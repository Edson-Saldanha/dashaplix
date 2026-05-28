import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import path from 'path'

export default defineConfig({
  server: {
    host: '::',
    port: 8080,
    hmr: { overlay: false },
  },
  resolve: {
    tsconfigPaths: true,
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@tanstack/react-query', '@tanstack/query-core'],
  },
  plugins: [
    tanstackStart({ srcDirectory: 'src' }),
    react(),
    nitro({
      preset: process.env.VERCEL ? 'vercel' : 'node-server',
    }),
  ],
})
