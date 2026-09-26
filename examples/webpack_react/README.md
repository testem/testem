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

## What this is

React Testing Library runs in a **real browser**. Webpack bundles the component and the tests; Testem’s built-in Mocha runner executes them. There is no jsdom and no custom launcher.

This is distinct from [examples/webpack](../webpack) (Tape plus `buffer` / `process` polyfills), [examples/vite](../vite) (Mocha in a real browser via Vite middleware, no React), and [examples/browserify](../browserify) (the same Mocha + `before_tests` + `serve_files` shape, no React).

## How results get to Testem

`framework: "mocha"` uses Testem’s built-in runner page. Mocha and `/testem.js` load from the page; the Webpack bundle only registers `describe` / `it`. The runner calls `mocha.run()`.

The runner injects `serve_files` in `<head>`, so `document.body` is not available when the bundle first evaluates. Use the queries returned by `render()`, not Testing Library’s `screen` helper (that helper binds to `document.body` at import time).

## Config

- [`testem.json`](testem.json) — `before_tests` is `npx webpack`, `serve_files` is `test-bundle.js`, and `src_files` watches the JSX sources plus `webpack.config.js`.
- [`webpack.config.js`](webpack.config.js) — development mode, JSX via `babel-loader`, automatic React runtime.

`npx webpack` is required so the local `webpack-cli` runs on Windows cmd.exe. A bare `webpack` command is not on PATH there.

## Run Webpack alone

```bash
npx webpack
```

This writes `test-bundle.js`. It is not a test run.
