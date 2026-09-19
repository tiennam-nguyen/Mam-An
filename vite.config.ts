import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['demo/images/meal.svg', 'icons/icon.svg'],
    manifest: { name: 'Mâm An', short_name: 'Mâm An', lang: 'vi', theme_color: '#21594b', background_color: '#f7f5ee', display: 'standalone', icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,json,webmanifest}'], navigateFallbackDenylist: [/^\/api\//], runtimeCaching: [] },
  })],
});
