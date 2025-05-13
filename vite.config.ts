import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({  
  plugins: [
    tailwindcss(),
    svelte(),
  ],
  base: '/BitcoinTracker/', // Caminho base específico para o GitHub Pages
  publicDir: 'public', // Garante correto gerenciamento dos assets públicos
});