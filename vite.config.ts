import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Support multiple env var names for flexibility
  const apiKey = env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY;
  return {
    base: './', // CRITICAL: Ensure relative paths for Electron file:// protocol
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.GROQ_API_KEY': JSON.stringify(env.VITE_GROQ_API_KEY),
      'process.env.TAVILY_API_KEY': JSON.stringify(env.VITE_TAVILY_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: {
      watch: {
        ignored: ['**/android/**', '**/ios/**', '**/release/**']
      }
    }
  };
});
