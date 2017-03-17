Custom Browser Arguments with Testem
====================================

This document details the usage of the `browser_args` configuration option. Testem has the ability to automatically launch browsers or processes for you. Some of Testem's built-in launchers already supply a list of arguments to their respective browsers. You can add your own arguments to those lists for each browser.

An Example
----------

Here's an example `testem.js` file

```javascript
module.exports = {
  "framework": "qunit",
  "test_page": "tests/index.html",
  "launch_in_dev": [
    "Chrome"
  ],
  "browser_args": {
    "Chrome": [
      "--auto-open-devtools-for-tabs"
    ]
  }
};
```

In this example the `--auto-open-devtools-for-tabs` argument will be added to the list of arguments Testem supplies to the Chrome browser when it launches.

Conventions
-----------

* The `browser_args` option is an object, i.e., a hash
* The keys are launcher names, e.g., "Chrome" and they don't need to be capitalized
* The values can be either:
  * An array of strings (if you need to add many arguments)
  * A single string (if you only need to add one argument)

    ```javascript
    "browser_args": {
      "Chrome": [
        "--auto-open-devtools-for-tabs"
      ]
    }

    // OR

    "browser_args": {
      "chrome": "--auto-open-devtools-for-tabs"
     }
    ```

Launchers
---------

Below is a list of built-in launchers. Use the names of the launchers as keys in the `browser_args` hash. The key names do not need to be capitalized.

Note: This guide doesn't go into depth about the numerous command line arguments supported by each browser. It's a good idea to make sure the arguments you want to use work on the command line _before_ including them in the `browser_args` options.

* Chrome
* Chrome Canary
* Chromium
* Firefox
* IE
* Opera
* PhantomJS
* Safari
* Safari Technology Preview

Logging
-------

Using browser arguments can be tricky. It can be hard to know if the options you've supplied are working correctly. Testem will log warning messages whenever it encounters a problem with any of the `browser_args` options. You will need to use the `debug` configuration option in order to read the log.

Read [more details](docs/config_file.md) about the config options including `debug`.

Potential warnings:

* `browser_args` is defined but isn't an object
* One or more of the keys in the hash doesn't match the name of a built-in launcher, e.g., "Crome" vs. "Chrome"
* One or more of the values in the hash wasn't an array or a string
* One or more of the values in the hash is an empty array or an empty string
* One of the values in the hash is an array but contains non-string or empty string values
* One or more of the values in the hash duplicates an argument for a given browser

PhantomJS Args
--------------

Prior to the availability of the `browser_args` configuration option, Testem allowed for a `phantomjs_args` option. This option is still available; however, it has the same purpose as `browser_args`.

These two example options are essentially the same:

```javascript
"phantom_args": [
  "--remote-debugger-port=1234"
],
"browser_args": [
  "PhantomJS": "--remote-debugger-port=1234"
]
```

While it may be strange to include both, this is not invalid.

Note:

* If the two options contain different flags, they will be combined
* If the two options produce duplicates, they will be deduped
