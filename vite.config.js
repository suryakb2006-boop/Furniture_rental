import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'client',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 1000 },
  server: {
    port: 5173,
    open: true,
    proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' },
  },
});
