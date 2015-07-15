Testem Custom Reporters
=========================

If the built-in reporters don't do quite what you need, you can write your own.
This document describes how to write and configure your own custom test reporter.

## Interface

Your reporter should have `total` and `pass` properties, and implement `report(prefix, data)` and
`finish()` methods.

The `report` method gets called for each test with `prefix` and `data` arguments:
* `prefix` - name of the test runner (ie PhantomJS)
* `data` 
    * `passed` - whether test passed
    * `name` - test name 
    * `error.message` - error stack
    * `logs` - test output

The `finish` method gets called when tests are complete, and can output summary information.

## Example

The constructor should take an (optional) output stream and initialize properties:

    function MyReporter(out) {
        this.out = out || process.stdout;
        this.total = 0;
        this.pass = 0;
    }

The `report` method should increment counters and output results as needed; the `finish`
method should output summary information:

    MyReporter.prototype = {
        report: function(prefix, data) {
            // increment counters 
            this.total++;
            if (data.passed) {
                this.pass++;
            }
            // output results
            var status = data.passed ? 'ok' : 'failed';
            this.out.write(prefix+'\t'+status+'\t'+data.name.trim()+'\n');
        },
        finish: function() {
            this.out.write(this.passed+'/'+this.total+' tests passed\n')
        }
    }

## Configuration

To use your custom reporter, set `reporter` in your `testem.js` config file:

    var MyReporter = require('./my-reporter');
    module.exports = {
        "framework": "mocha",
        "src_files": [
            "src/*.js",
            "tests/*_tests.js"
        ]
        "reporter": new MyReporter()
    };



