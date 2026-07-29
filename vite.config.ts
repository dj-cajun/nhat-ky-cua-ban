import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'zmp-sdk/apis': path.resolve(__dirname, './src/shims/zmp-sdk/apis.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Cloudflare quick tunnel / Cursor port-forward hostnames
    allowedHosts: true,
    hmr: {
      // Don't block the demo UI with Vite websocket overlays over tunnels
      overlay: false,
    },
  },
});
