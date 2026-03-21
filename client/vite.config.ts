import tailwindcss from '@tailwindcss/vite';
// Nudge Vite reload
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Supabase lives in ../server/.env; default Vite only reads client/.env
  const serverEnvDir = path.resolve(__dirname, '../server');
  const clientEnvDir = path.resolve(__dirname, '.');
  const env = {
    ...loadEnv(mode, serverEnvDir, ''),
    ...loadEnv(mode, clientEnvDir, ''),
  };
  return {
    envDir: serverEnvDir,
    plugins: [tailwindcss(), react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
