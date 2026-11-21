import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Group libraries every page needs; three.js / R3F stay in the lazily loaded scene chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)\//.test(id)) return 'react';
          if (/node_modules\/(gsap|@gsap|lenis|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          if (id.includes('node_modules/simple-icons/')) return 'icons';
          return undefined;
        },
      },
    },
  },
});
