SauceLab Integration
========================

Run your tests on various browsers hosted on SauceLabs!

Instructions
------------

1. Get a [SauceLabs](https://saucelabs.com/) account.
2. Install dependencies from the testem repo root (`npm i`). The [saucie](https://github.com/johanneswuerbach/saucie) devDependency starts Sauce Connect and runs browsers on Sauce Labs. `testem.json` maps `/node_modules` to `../../node_modules` so the built-in Jasmine runner loads `jasmine-core` from that root install (CI does not run `npm install` in this example).
3. Make sure Sauce credentials are set in env:
    * **SAUCE_USERNAME** - your SauceLabs username
    * **SAUCE_ACCESS_KEY** - your SauceLabs API/Access key.
4. Run `testem ci --port 8080` to run it on all the listed browsers - see `testem launchers` for the full list.
    * *It will take a while at the first time. This will only happen once to download the Sauce Connect binary*

Sauce Connect lifecycle
-----------------------

The `on_start` hook ([`saucie-connect.js`](saucie-connect.js)) uses saucie 4.0.2+ to:

- start Sauce Connect detached so the tunnel survives hook exit
- wait for local `/readyz` and Sauce Labs API `is_ready`
- write the process id to `sc_client.pid`

The `on_exit` hook ([`saucie-disconnect.js`](saucie-disconnect.js)) stops that process via `saucie.disconnect()`.

See the [saucie Sauce Connect tunnel options](https://github.com/johanneswuerbach/saucie#sauce-connect-tunnel-options) for details.

Browser launchers
-----------------

`SL_Safari_Current` uses `-v latest` because fixed Safari versions (for example `17`) are retired on Sauce Labs over time. `SL_Safari_Last` pins an older release for regression coverage.

The CI `launch_in_ci` set targets browsers that run **jasmine-core 5** (Chrome, Firefox, Safari, Edge). `SL_Chrome_Current_No_Details` (TAP protocol without `--attach`) is also excluded from CI; it relied on legacy Sauce result scraping that does not work with the modern Jasmine runner.
