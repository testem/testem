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

Vitest runs as a **Node process** under a custom Testem launcher. There is no `framework: "vitest"` and no browser adapter. Testem does not execute the suite; it launches `vitest run` and displays the results.

This is distinct from [node_example](../node_example) (Mocha, exit-code protocol), [node_tap_example](../node_tap_example) (the [`tap`](https://www.npmjs.com/package/tap) package), and [examples/vite](../vite) (Mocha in a real browser via Vite middleware).

## How results get to Testem

Vitest ships a built-in `tap-flat` reporter. This example sets `"protocol": "tap"` so Testem parses per-test `ok` / `not ok` lines.

Only that reporter writes to stdout. `tap-flat` is used instead of nested `tap` so Testem shows two flat test names.

## Config

- [`testem.json`](testem.json) — `launchers.Vitest.command` (`npm run vitest`) and `"protocol": "tap"`.
- [`vitest.config.js`](vitest.config.js) — `environment: "node"`, `include: ["tests.js"]`, and `reporters: ["tap-flat"]`.
- The npm script is `vitest run`, not bare `vitest` (watch mode would hang CI).
- `tests.js` is listed in `include` because Vitest’s default globs (`*.test.js` / `test/**`) do not discover a root `tests.js`.
- The example is ESM (`"type": "module"`) so tests can `import` from `vitest` (Vitest 4 does not support `require('vitest')`).
- [`.npmrc`](.npmrc) sets `legacy-peer-deps=true` so `npm install` resolves Vitest 4’s peer tree.

## Run Vitest alone

```bash
npm run vitest
```

Output is TAP-flat, not the default reporter.
