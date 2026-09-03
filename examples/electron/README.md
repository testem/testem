## Setup

This example runs QUnit 2 in Electron via a custom launcher (`runtests.js`). QUnit is loaded from `node_modules/qunit/...` on a local `file://` page (with a `<base>` tag injected at launch time).

First install dependencies:

    npm install

Then run tests:

    npm test
