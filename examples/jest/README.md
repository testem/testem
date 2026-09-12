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

Jest runs as a **Node process** under a custom Testem launcher. There is no `framework: "jest"` and no browser adapter. Testem does not execute the suite; it launches Jest and displays the results.

## How results get to Testem

Jest has no built-in TAP reporter. This example installs [`jest-tap-reporter`](https://www.npmjs.com/package/jest-tap-reporter) and sets `"protocol": "tap"` so Testem parses per-test `ok` / `not ok` lines.

Only that reporter writes to stdout. Adding Jest’s `default` reporter would mix human-readable output into the TAP stream and confuse Testem’s parser.

## Config

- [`testem.json`](testem.json) — `launchers.Jest.command` (`npm run jest`) and `"protocol": "tap"`.
- [`jest.config.js`](jest.config.js) — `testEnvironment: "node"`, `watchman: false`, `testMatch` for `tests.js`, and TAP-only `reporters` with `logLevel: "ERROR"` and `showHeader: false`.

## Run Jest alone

```bash
npm run jest
```

Output is TAP, not Jest’s default reporter.
