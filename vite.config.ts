import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5501',
      '/apps': 'http://localhost:5501',
      '/reviews': 'http://localhost:5501',
      '/packages': 'http://localhost:5501',
      '/dashboard': 'http://localhost:5501',
      '/health': 'http://localhost:5501',
    },
  },
});
