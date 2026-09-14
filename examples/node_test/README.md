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

`node:test` runs as a **Node process** under a custom Testem launcher. There is no `framework: "node:test"` and no browser adapter. Testem does not execute the suite; it launches `node --test` and displays the results.

This is distinct from [node_example](../node_example) (Mocha, exit-code protocol) and [node_tap_example](../node_tap_example) (the [`tap`](https://www.npmjs.com/package/tap) package).

## How results get to Testem

Node ships `--test-reporter=tap`. This example sets `"protocol": "tap"` so Testem parses per-test `ok` / `not ok` lines.

Only that reporter writes to stdout. Nested TAP from the file-level subtest is expected; Testem’s TAP consumer already handles it.

## Config

- [`testem.json`](testem.json) — `launchers.NodeTest.command` (`node --test --test-reporter=tap tests.js`) and `"protocol": "tap"`.
- `tests.js` is passed **explicitly**. `node --test` with no path does not discover a root `tests.js` (default globs are `*.test.js` / `test/**`).

## Run `node:test` alone

```bash
npm run node:test
```

Output is TAP, not the default spec reporter.
