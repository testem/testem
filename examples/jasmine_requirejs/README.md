## Setup

First install dependencies (`jasmine-core` and `requirejs`)

    npm install

Then, just run tests

    npm test

`index.html` loads Jasmine and RequireJS from `/node_modules/` (framework, then `/testem.js`, then RequireJS). Specs stay AMD modules.
