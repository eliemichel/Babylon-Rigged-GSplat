import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  
  resolve: {
    alias: {
      // Resolve Babylon.js internal aliases used in dev packages
      'core': path.resolve(__dirname, '../Babylon.js/packages/dev/core/dist'),
      'loaders': path.resolve(__dirname, '../Babylon.js/packages/dev/loaders/dist'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
