BrowserStack Integration
========================

Run your tests on various browsers hosted on Browserstack!

Instructions
------------

1. Get a [BrowserStack](browserstack.com) account.
2. Install [browserstack-cli](https://github.com/dbrans/browserstack-cli) via `npm install browserstack-cli -g`.
3. Download the [BrowserStack binary](https://www.browserstack.com/local-testing#command-line) to some safe location on your computer, such as `~/.browserstack`
4. Generate the browserstack configuration `browserstack setup` and enter your browserstack account information.
5. Run the command `testem ci -l bs_chrome` to test out the setup with just the Chrome browser hosted BrowserStack.
6. Run `testem ci` to run it on all the listed browsers - see `testem launchers` for the full list.

Word of Warning
---------------

There seems to be some amount of instability when using BrowserStack with Testem together; sometimes the BrowserStack browser will disconnect as soon as the tests finish, sometimes it will happen after a delay, and sometimes it will never happen at all.  Ideally, the browser would disconnect as soon as the tests finish; the other cases, you may experience a hang after the tests complete.  Use at your own risk!

