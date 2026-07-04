import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import zaloMiniApp from 'zmp-vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    zaloMiniApp({
      app: {
        title: 'Nhật ký của bạn',
        headerTitle: 'Nhật ký của bạn',
        headerColor: '#faf9f6',
        textColor: 'black',
        statusBar: 'normal',
        actionBarHidden: true,
        hideAndroidBottomNavigationBar: true,
        hideIOSSafeAreaBottom: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
