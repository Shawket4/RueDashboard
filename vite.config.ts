import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import compression from "vite-plugin-compression";
import { constants as zlibConstants } from "node:zlib";

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
          [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        },
      },
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: {
        level: 9,
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5173, host: true },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Charts
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'chart-vendor';
          }

          // Forms + validation
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('/zod/')
          ) {
            return 'form-vendor';
          }

          // TanStack Query + Table
          if (id.includes('@tanstack/')) return 'query-vendor';

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n-vendor';
          }

          // Date utilities
          if (id.includes('date-fns')) return 'date-vendor';

          // All Radix UI primitives
          if (id.includes('@radix-ui/')) return 'ui-vendor';

          // React core
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('react-router')
          ) {
            return 'react-vendor';
          }

          // Excel export
          if (id.includes('exceljs')) return 'exceljs-vendor';

          return undefined;
        },
      },
    },
  },
});
