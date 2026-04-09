## Setup

Source files live in `src/` as modern JavaScript. [Babel](https://babeljs.io/) compiles them to `hello.js` and `tests.js` in this directory before each run (`before_tests` in `testem.yml`).

First install dependencies

    npm install

Then, just run tests

    npm test
