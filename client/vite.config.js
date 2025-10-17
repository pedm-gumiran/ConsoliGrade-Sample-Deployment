import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    port: 5173, // set fixed port (avoid random scanning delays)
    open: true, // auto open browser
    hmr: {
      overlay: true, // keep error overlay, can set false if it slows down reloads
    },
  },

  //  Build optimizations (mostly for production)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-icons', 'react-toastify'],
          utils: ['axios', 'exceljs', 'file-saver', 'html2canvas', 'jspdf'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    cssMinify: true,
    minify: 'esbuild', //  esbuild is much faster than terser in dev & prod
  },

  //  Dependency pre-bundling (affects dev speed)
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-icons',
      'react-toastify',
      'axios',
      'exceljs',
      'jspdf',
    ],
  },
});
