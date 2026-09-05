Contributing to Testem
======================

Open source is all about DIY! If you want something fixed, it's sometimes faster to just roll your sleeves up, not to mention lots more rewarding. This doc will give you some pointers on where to look when you poke around Testem's source code.

Getting Started
---------------

* Fork and checkout [github.com/testem/testem](https://github.com/testem/testem)
* Use a [Node.js](https://nodejs.org/) version that satisfies the `engines.node` range in [`package.json`](package.json) (currently Node 22.12+, 24.x, or 26+).
* Run `npm install` and `npm test` to make sure you're off to a good start

Brief Code Walk Through
-----------------------

`testem.js` is the main entry point of the program. It then delegates to either `lib/dev/index.js` or `lib/ci/index.js` depending on whether it's development mode `testem` or continuous integration mode `testem ci`. All of the rest of the Node application's source is under the `lib` folder. You can probably figure out the rest from there.

The source code for the browser side is under the folders `public/testem` and `views`

* `public/testem` - is where the client side assets are (JavaScript and CSS)
* `views` - are HTML templates used to generate default test runner pages

Debug Mode
----------

Use the `-d` flag to turn on debug mode. This will allow you to use

    log.info('some log message')

To log to the debug log, which is `testem.log`. If the `log` is not present in a module file, require the local logger wrapper from `lib/log.js`:

    var log = require('./log')

Then, in a separate terminal you can tail the log and monitor debug messages

    tail -f testem.log

Tests and Examples
------------------

To maximize the chances of your pull request getting merged, you should go with a test-first approach. That means:

1. write a failing test that demonstrates the bug or lack of feature
2. fix bug or implement feature, getting the test to pass

To run the tests:

    npm test

Or in the spirit of eating our own dog food:

    testem

`tests/ui/*` is the interactive dashboard suite. Those tests inject terminal-kit's `createTerminal` with fake streams (no real TTY) and run on Windows CI. `npm run integration` uses `testem ci` and does **not** exercise the TUI. To check the dashboard on a real terminal:

    npm run dogfood:tui

To lint your code:

    npm run lint

If it isn't practical to write a test first, it might be my fault, feel free to chat.

*Protip: to make the tests run faster during TDD, use Mocha's exclusive test feature, i.e. `describe.only` and `it.only`.*


### Integration Tests

There are also integration tests that run every example in the `examples` folder by `cd`'ing into each and executing `testem ci`. CI runs them on Linux, macOS, and Windows (`windows-latest` in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)). The runner is [`bin/run-integration.js`](bin/run-integration.js):

* **`skipExamples`** — `browserstack` and `saucelabs` (need credentials; not run in CI).
* **`skipOnWindows`** — none. The `coffeescript` example lists CoffeeScript sources explicitly instead of `*.coffee` (cmd.exe does not expand globs for external programs). The `webpack` example uses `npx webpack` so local `webpack-cli` runs without relying on PATH. See [`examples/coffeescript`](examples/coffeescript) and [Available hooks](docs/config_file.md#available-hooks).
* **Concurrency** — Windows runs examples one at a time (Headless Firefox is flaky in parallel); set `INTEGRATION_TESTS_CONCURRENCY` to override.

Examples that use built-in runners must list `mocha`, `chai`, `jasmine-core`, or `qunit` in their own `package.json` (the integration runner already runs `npm install` in each example). Custom `test_page` examples load frameworks from `/node_modules/` directly. `mocha_simple` uses local Mocha plus Chai 6 (ESM).

Node + headless browser:

    npm run integration
