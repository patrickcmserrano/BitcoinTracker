/** @type {import('tailwindcss').Config} */
import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';

export default {
  // Certifique-se de que o darkMode esteja configurado para reconhecer o atributo data-mode="dark"
  darkMode: ['class', '[data-mode="dark"]'],
  content: [
    './src/**/*.{html,js,svelte,ts}',
    join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
  ],
  theme: {
    extend: {},
  },
  plugins: [
    skeleton({
      themes: {
        preset: [
          {
            name: 'vintage',
            enhancements: true
          }
        ]
      }
    })
  ],
}