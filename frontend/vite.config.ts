import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8234,
    proxy: {
      '/api': {
        target: 'http://localhost:3234',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3234',
        changeOrigin: true,
        ws: true
      }
    }
  }
});
