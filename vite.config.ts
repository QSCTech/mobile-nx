import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import react from '@vitejs/plugin-react-swc'
import devProxy from './vite.devProxy'
import buildWidgets from './vite.buildWidgets'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: {
    target: 'esnext',
    rollupOptions: { external: ['dotenv'] },
  },
  plugins: [
    react(),
    devProxy(), // 开发时跨源代理
    buildWidgets(), // 构建extHelper.{js,.d.ts}以及内置小组件
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
})
