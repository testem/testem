## Setup

This example stays on jasmine-core 5 because `index.html` hardcodes `boot0.js`/`boot1.js`. jasmine-core 7 custom pages load `boot.js` only.

First install dependencies (`jasmine-core` and `requirejs`)

    npm install

Then, just run tests

    npm test

`index.html` loads Jasmine and RequireJS from `/node_modules/` (framework, then `/testem.js`, then RequireJS). Specs stay AMD modules.
