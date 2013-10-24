SauceLab Integration
========================

Run your tests on various browsers hosted on SauceLabs!

Instructions
------------

1. Get a [SauceLabs](https://saucelabs.com/) account.
2. Install [saucie](https://github.com/igorlima/sauce-js-tests-integration) via `npm install saucie@0.1.0 -g`.
3. Make sure Sauce credentials are set in env:
    * **SAUCE_USERNAME** - your SauceLabs username
    * **SAUCE_ACCESS_KEY** - your SauceLabs API/Access key.
4. Run `testem ci --port 8080` to run it on all the listed browsers - see `testem launchers` for the full list.
    * *It will take a while at the first time. This will only happen once to download the jar of Sauce Connect*
