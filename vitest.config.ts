import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({ 
      hot: !process.env.VITEST,
      compilerOptions: {
        dev: true
      }
    })
  ],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        inline: [/^svelte/, /@testing-library\/svelte/]
      }
    },
    alias: {
      $lib: './src/lib',
      $app: './src/app'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
        '**/*.config.ts',
        'src/**/*.{test,spec}.{js,ts,svelte}',
      ],
    },
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    conditions: ['browser']
  }
});