## Setup

First install dependencies

    npm install

Then, just run tests

    npm test

`before_tests` runs `npx webpack` so the local `webpack-cli` is used on all platforms (a bare `webpack` command is not on PATH in Windows cmd.exe).
