const { defineConfig } = require('vite');
const { vitePluginTestem } = require('./vite-plugin-testem');

module.exports = defineConfig({
  plugins: [
    vitePluginTestem({
      framework: 'mocha',
    }),
  ],
});
