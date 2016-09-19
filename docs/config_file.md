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

* **framework** - the test framework that you are using, in the browser, in the case that you are not also using the `test_page` option. The possible values at the moment are `jasmine`, `qunit`, `mocha`, and `buster`.
* **src_files** - the location of your source files. This should be the code that you author directly, and not generated source files. So, if you are writing in CoffeeScript or TypeScript, this should be your `.coffee` or `.ts` files. If you are writing in Javascript, this would just be your `.js` files, but if you have a compile step for your JS, this would be the `.js` file pre-compilation. The files matched here are what Testem watches for modification (the *watch list*) so that it promptly re-runs the tests when any of them are saved.
* **serve_files** - the location of the source files to be served to the browser. If don't have a compilation step, don't set this option, and it will default to *src_files*. If you have a compilation step, you should set this to the `*.js` file(s) that result from the compilation.
* **test_page** - if you want to use a custom test page to run your tests, put its path here. In most cases, when you use this option, the *src_files* option becomes unnecessary because Testem simply adds all requested files into the watch list. You will also make sure that you include the `/testem.js` script in your test page if you use this option - simply include it with a script tag just below the include for your test framework, i.e. `jasmine.js`.
* **launchers** - this option allows you to set up custom process launchers which can be used to run Node programs and indeed any kind of process within Testem.

## Option Reference

### CLI-level options:

    file:                    [String]  configuration file (testem.json, .testem.json, testem.yml, .testem.yml)
    host:                    [String]  server host to use (localhost)
    port:                    [Number]  server port to use (7357)
    launch:                  [Array]   list of launchers to use for current runs (defaults to current mode)
    skip:                    [Array]   list of launchers to skip
    debug:                   [Boolean] debug mode (false)
    test_page:               [String]  path to the page to use to run tests
    growl:                   [Boolean] enables growl / native notifications (false)
    bail_on_uncaught_error:  [Boolean] whether process should exit with error status when there are top level uncaught errors (via `window.onerror`) (true)

### Config-level options:

    browser_disconnect_timeout   [Number]  timeout to error after disconnect in seconds (10s)
    browser_start_timeout        [Number]  timeout to error after browser start in seconds (30s)
    browser_args:                [Object]  hash of browsers (keys) and their custom aruments (values)
    css_files:                   [Array]   additionals stylesheets to include
    cwd:                         [Path]    directory to use as root
    config_dir:                  [Path]    directory to use as root for resolving configs, if different than cwd
    disable_watching:            [Boolean] disable any file watching
    fail_on_zero_tests:          [Boolean] whether process should exit with error status when no tests found
    firefox_profile:             [String]  relative path to firefox profile directory for testem to use. by default one is created automatically.
    framework:                   [String]  test framework to use
    ignore_missing_launchers:    [Boolean] ignore missing launchers in ci mode
    parallel:                    [Number]  max number of parallel runners (1)
    launchers:                   [Object]  a specification for all custom launchers
    launch_in_dev:               [Array]   list of launchers to use for dev runs
    launch_in_ci:                [Array]   list of launchers to use for CI runs
    phantomjs_debug_port:        [Number]  port used to attach phantomjs debugger
    phantomjs_args:              [Array]   custom arguments for the phantomjs launcher
    phantomjs_launch_script:     [String]  path of custom phantomjs launch script
    reporter:                    [String]  name of the reporter to be used in ci mode (tap, xunit, dot)
    report_file:                 [String]  file to write test results to (stdout)
    routes:                      [Object]  overrides for assets paths
    src_files:                   [Array]   list of files or file patterns to use
    src_files_ignore:            [Array]   list of files or file patterns to exclude from usage
    serve_files:                 [Array]   list of files or file patterns to inject into test playground (defaults to src_files)
    serve_files_ignore:          [Array]   list of files or file patterns to exclude from test playground (defaults to src_files_ignore)
    timeout:                     [Number]  timeout for a browser
    unsafe_file_serving:         [Boolean] allow serving directories that are not in your CWD (false)
    url:                         [String]  url server runs at (http://{host}:{port}/)
    user_data_dir:               [String]  directory to initialize the browser user data directories (default a temporary directory)
    watch_files:                 [Array]   list of files or file patterns to watch changes of (defaults to src_files)
    xunit_intermediate_output    [Boolean] print tap output for the xunit reporter (false)

### Available hooks:

    on_start:             Runs on suite startup
    before_tests:         Runs before every run of tests
    after_tests:          Runs after every run of tests
    on_exit:              Runs before suite exits
