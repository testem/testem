var path = require('path');
var esbuild = require('esbuild');
var nodeModulesPolyfillPlugin = require('@esbuild-plugins/node-modules-polyfill').NodeModulesPolyfillPlugin;
var browserPolyfills = require('../../../lib/utils/esbuild-browser-polyfills');

var fixtureDir = __dirname;

esbuild.build({
  entryPoints: [path.join(fixtureDir, 'tests.js')],
  bundle: true,
  outfile: path.join(fixtureDir, 'public', 'bundle.js'),
  platform: 'browser',
  plugins: [nodeModulesPolyfillPlugin()],
  inject: [browserPolyfills.bufferInject],
  define: browserPolyfills.define,
  banner: browserPolyfills.banner
}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
