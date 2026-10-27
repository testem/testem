import { createTestemViteMiddleware } from 'vite-plugin-testem';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function testemConfig() {
  const { middleware } = await createTestemViteMiddleware({
    root: __dirname,
  });

  return {
    middleware: [middleware],
    framework: 'mocha',
    test_page: 'index.html',
    src_files: ['src/**/*.js', 'vite.config.js'],
    launch_in_dev: ['Headless Firefox'],
    launch_in_ci: ['Headless Firefox'],
  };
}
