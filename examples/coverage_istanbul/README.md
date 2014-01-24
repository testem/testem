DIY Code Coverage for Testem w Istanbul
=======================================

This is an example of how to generate a code coverage report using Testem + Istanbul. Until direct coverage support lands in Testem, you can use this as a starting point.

## Setup

First install istanbul

    npm install istanbul -g

Next, you need to run the coverage server in another terminal

    node coverage_server.js

Then, just run testem

    testem

When you are done with the tests, and quit testem, you should see HTML reports in `coverage/lcov-report/index.html`