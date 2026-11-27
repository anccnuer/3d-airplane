import { defineConfig, type ServerOptions } from 'vite';
import path from 'node:path';

const server = {
  host: '0.0.0.0',
  allowedHosts: true,
  port: 5173
} as unknown as ServerOptions;

export default defineConfig({
  resolve: {
    alias: {
      '@classroom-arena/shared': path.resolve(__dirname, '../shared/src/index.ts')
    }
  },
  server,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        }
      }
    }
  }
});
