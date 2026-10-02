import { defineConfig } from 'vite';
import { vitePluginTestem } from 'vite-plugin-testem';

export default defineConfig({
  plugins: [
    vitePluginTestem({
      framework: 'mocha',
    }),
  ],
});
