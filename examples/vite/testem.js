import { createTestemViteMiddleware } from 'vite-plugin-testem';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let viteClose;

export default async function testemConfig() {
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
}
