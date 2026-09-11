DIY Code Coverage for Testem w nyc
==================================

This is an example of how to generate a code coverage report using Testem + nyc (the Istanbul CLI). Until direct coverage support lands in Testem, you can use this as a starting point. Node-only projects should use c8 instead of this browser `__coverage__` flow.

## Setup

First install dependencies (`nyc`, `jasmine-core`)

    npm install

Then, just run tests

    npm test

When you are done with the tests, and quit testem, you should see HTML reports in `coverage/index.html`
