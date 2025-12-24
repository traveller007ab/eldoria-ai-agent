import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Support multiple env var names for flexibility
  const apiKey = env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY;
  return {
    base: './', // CRITICAL: Ensure relative paths for Electron file:// protocol
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Eldoria AI IDE',
          short_name: 'Eldoria',
          description: 'Sentient Academic Co-Pilot & Research IDE',
          display: 'standalone',
          background_color: '#020617',
          theme_color: '#06b6d4',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true
        }
      })
    ],
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
