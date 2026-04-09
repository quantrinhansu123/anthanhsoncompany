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
    envDir: clientEnvDir,
    plugins: [tailwindcss(), react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
    },
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
