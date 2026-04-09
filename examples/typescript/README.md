## Setup

Source files live in `src/` as TypeScript. The compiler emits `hello.js` and `tests.js` in this directory (`tsconfig.json`); Testem runs `tsc` before each run via `before_tests` in `testem.yml`.

First install dependencies

    npm install

Then, just run tests

    npm test
