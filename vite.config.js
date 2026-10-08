import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 1000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
