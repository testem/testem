const { createTestemViteMiddleware } = require('vite-plugin-testem');

let viteClose;

module.exports = async function testemConfig() {
  const { middleware, close } = await createTestemViteMiddleware({
    root: __dirname,
  });
  viteClose = close;

  return {
    middleware: [middleware],
    framework: 'mocha',
    test_page: 'index.html',
    src_files: ['src/**/*.js', 'vite.config.js'],
    launch_in_dev: ['Headless Firefox'],
    launch_in_ci: ['Headless Firefox'],
    on_exit(config, data, callback) {
      if (!viteClose) {
        return callback(null);
      }
      viteClose()
        .then(() => callback(null))
        .catch(callback);
    },
  };
};
