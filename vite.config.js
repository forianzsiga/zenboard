import { defineConfig } from 'vite';

export default defineConfig({
  base: '/zenboard/',
  root: '.',
  server: {
    port: 5173,
    host: true
  }
});
