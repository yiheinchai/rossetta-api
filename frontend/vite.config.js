import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@rossetta-api/client': path.resolve(__dirname, 'node_modules/@rossetta-api/client/index.js')
    }
  },
  optimizeDeps: {
    include: ['@rossetta-api/client'],
    force: true
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
