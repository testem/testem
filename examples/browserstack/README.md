BrowserStack Integration
========================

Run your tests on various browsers hosted on Browserstack!

Instructions
------------

1. Get a [BrowserStack](browserstack.com) account.
2. Install [browserstack-cli](https://github.com/dbrans/browserstack-cli) via `npm install browserstack-cli -g`.
3. Generate the browserstack configuration `browserstack setup` and enter your browserstack account information.
4. Run the command `testem ci -l bs_chrome` to test out the setup with just the Chrome browser hosted BrowserStack.
5. Run `testem ci` to run it on all the listed browsers - see `testem launchers` for the full list.

