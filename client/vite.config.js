import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const removeElectronCrossorigin = {
  name: 'remove-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/ crossorigin/g, '');
  }
};

export default defineConfig({
  base: './',
  plugins: [react(), removeElectronCrossorigin],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants/index.js'),
      '@schemas':   path.resolve(__dirname, './src/schemas'),
      '@features':  path.resolve(__dirname, './src/features'),
      '@lib':       path.resolve(__dirname, './src/lib'),
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true }
    }
  }
});
