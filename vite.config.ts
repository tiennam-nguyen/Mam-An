import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [
      react(),
      VitePWA({
        disable: env.VITE_ENABLE_PWA === 'false',
        registerType: 'prompt',
        includeAssets: ['demo/images/meal.svg', 'icons/icon.svg'],
        manifest: {
          name: 'Mâm An',
          short_name: 'Mâm An',
          lang: 'vi',
          theme_color: '#21594b',
          background_color: '#f7f5ee',
          display: 'standalone',
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,json,webmanifest}'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false },
      },
    },
  };
});
