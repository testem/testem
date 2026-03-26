var path = require('path');
var esbuild = require('esbuild');
var nodeModulesPolyfillPlugin = require('@esbuild-plugins/node-modules-polyfill').NodeModulesPolyfillPlugin;
var browserPolyfills = require('../../lib/utils/esbuild-browser-polyfills');

esbuild.build({
  entryPoints: [path.join(__dirname, 'tests.js')],
  bundle: true,
  outfile: path.join(__dirname, 'bundle.js'),
  platform: 'browser',
  plugins: [nodeModulesPolyfillPlugin()],
  inject: [browserPolyfills.bufferInject],
  define: browserPolyfills.define,
  banner: browserPolyfills.banner
}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
