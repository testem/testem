SauceLab Integration
========================

Run your tests on various browsers hosted on SauceLabs!

Instructions
------------

1. Get a [SauceLabs](https://saucelabs.com/) account.
2. Install [saucie](https://github.com/igorlima/sauce-js-tests-integration) via `SAUCE_CONNECT_DOWNLOAD_ON_INSTALL=true sudo -E npm install saucie -g`. If the SAUCE_CONNECT_DOWNLOAD_ON_INSTALL environment variable is not set then [sauce-connect-launcher will attempt to download it](https://github.com/bermi/sauce-connect-launcher#installation) on the first run which might prevent saucie from working if elevated privileges are not used.
3. Make sure Sauce credentials are set in env:
    * **SAUCE_USERNAME** - your SauceLabs username
    * **SAUCE_ACCESS_KEY** - your SauceLabs API/Access key.
4. Run `testem ci --port 8080` to run it on all the listed browsers - see `testem launchers` for the full list.
    * *It will take a while at the first time. This will only happen once to download the jar of Sauce Connect*
