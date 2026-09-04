## Setup

First install dependencies (`coffeescript`, `jasmine-core`)

    npm install

Then, just run tests

    npm test

The example compiles `hello.coffee` and `tests.coffee` to JavaScript before each run (`before_tests` in `testem.yml`), then uses Testem's built-in `jasmine2` runner with Jasmine 5 from `node_modules`. Sources are listed explicitly in the hook (not `*.coffee`) so the example runs in Windows integration tests—see [Available hooks](../../docs/config_file.md#available-hooks).
