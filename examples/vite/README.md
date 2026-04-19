## Setup

Install dependencies:

```bash
npm install
```

Run tests (CI mode):

```bash
npm test
```

Interactive dev:

```bash
node ../../testem.js
```

## How it works

Testem serves the browser and the Testem client (`/testem.js`, Socket.IO). This example embeds [Vite middleware mode](https://vite.dev/guide/ssr.html#setting-up-the-dev-server) ahead of Testem’s static file handler so `@vite/client`–style module resolution works for your entry HTML.

### `vite-plugin-testem`

The [`vite-plugin-testem`](https://www.npmjs.com/package/vite-plugin-testem) package (installed as a dev dependency) provides:

1. **`vitePluginTestem()`** — a Vite plugin that can inject `/testem.js` (and the TAP bridge for `framework: 'tap'`). This example loads `/testem.js` explicitly in `index.html` in the same order as Testem’s [Mocha runner template](../../views/mocharunner.mustache), so the plugin does not add a second copy.
2. **`createTestemViteMiddleware()`** — builds a Vite dev server in middleware mode and returns Express middleware for Testem’s `middleware` config. It skips URLs that belong to Testem so the client still loads from the same origin.

See the package README for full API details and the recommended **`on_exit`** handler when using the middleware.

HMR is turned off in middleware mode here because Testem’s Express app would need explicit wiring to Vite’s WebSocket server; you can still get fast feedback from Testem’s file watching and reloads.

`testem.js` uses **`on_exit`** to call the Vite server’s `close()` hook so watchers and other resources shut down cleanly when Testem exits.

### Mocha + Vite

`index.html` loads Mocha’s **prebuilt browser bundle** `mocha/mocha.js` (the UMD file shipped in the package) with plain `<script>` tags, then `/testem.js`, then `mocha.setup('bdd')`, matching the usual Testem order. The test file is a **module** so you can `import` Chai and your sources; it finishes with `mocha.run()`.

Importing the package entry (`import mocha from 'mocha'`) pulls in code paths that expect Node’s `process` while Vite prebundles; using the prebuilt `mocha.js` avoids that.

For comparison with other ecosystems: [karma-vite](https://github.com/credred/karma-vite) embeds Vite in Karma; this setup does the analogous thing for Testem’s Express stack. Embroider’s Vite integration targets Ember apps; [web-test-runner’s Vite plugin](https://modern-web.dev/docs/dev-server/plugins/vite/) targets Web Test Runner.
