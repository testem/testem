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

React 19 in a **real browser** with no bundler and no JSX. A custom `test_page` loads Mocha and Chai from `/node_modules`. Distinct from [examples/mocha_simple](../mocha_simple) (the same page shape, no React) and [examples/vite](../vite) (Mocha in a real browser via Vite middleware, no React).

## How results get to Testem

The custom page loads Mocha and `/testem.js` first, then calls `Testem.hookIntoTestFramework()`. The ESM spec registers `describe` / `it` and calls `mocha.run()`.

## Config

- [`test.html`](test.html) — import map for `react` and `react-dom/client` from [esm.sh](https://esm.sh) (`?dev` so `act` is available; the production ESM build does not export it). `?external=react` keeps one React copy.
- [`testem.json`](testem.json) — `test_page` is `test.html`, and `src_files` watches `*.js`.

The browser needs a network connection the first time it fetches those modules (esm.sh is cached afterward).

## No build step

There is nothing to compile. The component uses `createElement` instead of JSX so Babel is not required.
