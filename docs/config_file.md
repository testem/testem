Testem Configuration File
=========================

This document will go into more detail about the Testem configuration file and list in glorious detail all of its available options. The config file is in either JSON format or YAML format and can be called any of the following

* `testem.json`
* `.testem.json`
* `testem.yml`
* `.testem.yml`
* `testem.js`

The file is looked for in the user's current directory.

An Example
----------

Here's an example `testem.json` file

    {
        "framework": "mocha",
        "src_files": [
            "src/*.js",
            "tests/*_tests.js"
        ]
    }

Here's an example `testem.js` file that defines a [custom reporter](custom_reporter.md):

    var CustomReporter = require('./my-custom-reporter');
    module.exports = {
        "framework": "mocha",
        "src_files": [
            "src/*.js",
            "tests/*_tests.js"
        ]
        "reporter": new CustomReporter()
    };


Common Configuration Options
----------------------------

* **framework** - the test framework that you are using, in the browser, in the case that you are not also using the `test_page` option. The possible values at the moment are `jasmine`, `jasmine2`, `qunit`, `mocha`, `custom`, and `tap`. Defaults to `jasmine`.
* **src_files** - the location of your source files. This should be the code that you author directly, and not generated source files. So, if you are writing in CoffeeScript or TypeScript, this should be your `.coffee` or `.ts` files. If you are writing in Javascript, this would just be your `.js` files, but if you have a compile step for your JS, this would be the `.js` file pre-compilation. The files matched here are what Testem watches for modification (the *watch list*) so that it promptly re-runs the tests when any of them are saved.
* **serve_files** - the location of the source files to be served to the browser. If don't have a compilation step, don't set this option, and it will default to *src_files*. If you have a compilation step, you should set this to the `*.js` file(s) that result from the compilation.
* **test_page** - if you want to use a custom test page to run your tests, put its path here. In most cases, when you use this option, the *src_files* option becomes unnecessary because Testem simply adds all requested files into the watch list. You will also make sure that you include the `/testem.js` script in your test page if you use this option - simply include it with a script tag just below the include for your test framework, i.e. `jasmine.js`.
* **launchers** - this option allows you to set up custom process launchers which can be used to run Node programs and indeed any kind of process within Testem.

## Option Reference

### Potentially available browsers

Chrome, Chrome Canary, Chromium, Firefox, IE, Opera, PhantomJS, Safari, Safari Technology Preview

### CLI-level options:

    file:                    [String]  configuration file (testem.json, .testem.json, testem.yml, .testem.yml)
    host:                    [String]  server host to use (localhost)
    port:                    [Number]  server port to use (7357)
    launch:                  [Array]   Comma-delimited list of launchers to use for current runs (defaults to current mode)
    skip:                    [Array]   Comma-delimited list of launchers to skip
    debug:                   [Boolean] debug mode (false)
    test_page:               [String]  string (or array of string) paths to the pages to use to run tests
    growl:                   [Boolean] enables growl / native notifications (false)
    bail_on_uncaught_error:  [Boolean] whether process should exit with error status when there are top level uncaught errors (via `window.onerror`) (true)

### Config-level options:

    custom_browser_socket_events    [Object]  an object containing keys corresponding to event names that point to handler functions, which are to be added to the browser socket
    browser_disconnect_timeout   [Number]  timeout to error after disconnect in seconds (10s)
    browser_reconnect_limit      [Number]  number of browser reconnects to allow (3)
    browser_start_timeout        [Number]  timeout to error after browser start in seconds (30s)
    browser_paths:               [Object]  hash of browsers (keys) to an string of their binary paths (values)
    browser_exes:                [Object]  hash of browsers (keys) to an string of their binary names (values)
    browser_args:                [Object]  hash of browsers (keys) to an array of their custom arguments (values) or an object with a mode and arguments
    client_decycle_depth         [Number]  number of times to recurse while decycling objects within the client (5)
    config_dir:                  [Path]    directory to use as root for resolving configs, if different than cwd
    css_files:                   [Array]   string or array of additional stylesheets to include
    cwd:                         [Path]    directory to use as root
    dev_mode_file_reporter:      [String]  in dev mode the default reporter is 'dev' for the standard output. It is possible to specify a custom reporter which will report to report_file ('tap' reporter is used otherwise)
    disable_watching:            [Boolean] disable any file watching
    fail_on_zero_tests:          [Boolean] whether process should exit with error status when no tests found
    firefox_user_js:             [String]  path to firefox custom user.js file to be used
    framework:                   [String]  test framework to use; defaults to "jasmine"
    ignore_missing_launchers:    [Boolean] ignore missing launchers in ci mode
    launchers:                   [Object]  a specification for all custom launchers (each launcher name mapped to an object with `command` (shell) and optionally `protocol="tap"`
    launch_in_dev:               [Array]   list of launchers to use for dev runs
    launch_in_ci:                [Array]   list of launchers to use for CI runs
    middleware                   [Array]   list of functions to be called with the express app instance
    parallel:                    [Number]  max number of parallel runners (1)
    phantomjs_debug_port:        [Number]  port used to attach phantomjs debugger
    phantomjs_args:              [Array]   custom arguments for the phantomjs launcher from http://phantomjs.org/api/command-line.html
    phantomjs_launch_script:     [String]  path of custom phantomjs launch script
    proxies                      [Object]  path to options including `onlyContentTypes` and https://github.com/nodejitsu/node-http-proxy#options
    reporter:                    [String]  name of the reporter to be used in ci mode ("tap" (default), "xunit", "dot", "teamcity") or an object implementing https://github.com/testem/testem/blob/master/docs/custom_reporter.md
    report_file:                 [String]  file to write test results to (stdout)
    route or routes:             [Object]  overrides for assets paths
    socket_heartbeat_timeout     [Number]  heartbeat timeout on browser socket in seconds (defaults to `browser_disconnect_timeout` if `browser_disconnect_timeout` is provided. Else, 5s)
    src_files:                   [Array]   string or array list of files or file patterns to use
    src_files_ignore:            [Array]   string or array list of files or file patterns to exclude from usage
    serve_files:                 [Array]   string or array list of files or file patterns to inject into test playground (defaults to `src_files`)
    serve_files_ignore:          [Array]   string or array list of files or file patterns to exclude from test playground (defaults to `src_files_ignore`)
    single_run                   [Boolean] whether or not test is to be single-run
    socket_server_options        [Object]  options to start socketio and engineio within testem's server. Options can be found here: https://socket.io/docs/server-api/
    stdout_stream                [Stream]  the stdout stream to use (defaults to `process.stdout`)
    tap_quiet_logs               [Boolean] whether to suppress non-failing logs in TAP reporting
    timeout:                     [Number]  timeout for a browser
    unsafe_file_serving:         [Boolean] allow serving directories that are not in your CWD (false)
    url:                         [String]  url server runs at (http://{host}:{port}/)
    user_data_dir:               [String]  directory to initialize the browser user data directories (default a temporary directory)
    watch_files:                 [Array]   string or array list of files or file patterns to watch changes of (defaults to `src_files`)
    xunit_exclude_stack:         [Boolean] whether to exclude stack traces in xunit reporter
    xunit_intermediate_output    [Boolean] print tap output for the xunit reporter (false)

### HTTPS:

Testem allows the test page to be served via HTTPS. To enable HTTPS either the pfx or the cert and key options need to be specificed. More details around HTTPS in Node can be found here: https://nodejs.org/dist/latest-v4.x/docs/api/https.html#https_https_createserver_options_requestlistener

    cert:                        [String]  path to a public x509 certificate to use
    key:                         [String]  path to a private key to use for SS
    pfx:                         [String]  path to certificate, private key and CA certificates to use for SSL

### Available hooks:

Hooks can be defined as a string in which case they run as a shell command or as a function in which case they will be passed 3 arguments: the Testem config object, a data object if present (see below), and a callback which should be invoked with a falsey argument (or no arguments) to indicate a passing result or with a truthy argument (such as an `Error` object) to indicate a failing result.

    on_start:             Runs on suite startup
    on_change:            Runs when a (non-config) file being watched is changed. Has a data object with a `file` property set to the changed file's path
    before_tests:         Runs before every run of tests
    after_tests:          Runs after every run of tests
    on_exit:              Runs before suite exits
