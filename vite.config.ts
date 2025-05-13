import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// Removendo a configuração de teste que estava causando o erro
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
  ],
  base: process.env.NODE_ENV === 'production' ? '/BitcoinTracker/' : './',
});