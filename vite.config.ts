import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative base path so it works out-of-the-box on GitHub Pages and any subpath
  base: './',
  build: {
    outDir: 'dist',
  }
});
