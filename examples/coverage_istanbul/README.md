DIY Code Coverage for Testem w Istanbul
=======================================

This is an example of how to generate a code coverage report using Testem + Istanbul. Until direct coverage support lands in Testem, you can use this as a starting point.

## Setup

This example stays on jasmine-core 5 because `tests.html` hardcodes `boot0.js`/`boot1.js`. jasmine-core 7 custom pages load `boot.js` only.

First install dependencies (`istanbul`, `jasmine-core`, `rimraf`)

    npm install

Then, just run tests

    npm test

When you are done with the tests, and quit testem, you should see HTML reports in `coverage/lcov-report/index.html`
