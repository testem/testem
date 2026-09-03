## Setup

This example uses a custom `test_page` with **QUnit 2** from `/node_modules/qunit/...` (not the built-in `framework: "qunit"` runner, which still falls back to QUnit 1.x from CDN on Testem 3.x).

First install dependencies:

    npm install

Then run tests:

    npm test

`test.html` loads QUnit’s browser bundle, then `/testem.js`, then your specs. Tests use the QUnit 2 API (`QUnit.test`, `assert.*`).
