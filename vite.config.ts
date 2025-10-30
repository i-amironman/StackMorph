import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // ---
      // MODIFICATION: The 'define' block exposing the API key has been removed.
      // ---
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});