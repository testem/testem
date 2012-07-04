var Results = require('tap/lib/tap-results');
var Harness = require('tap/lib/tap-harness');

var Test = require('./test');
var output = require('./output');

module.exports = function () {
    var harness = new Harness(Test);
    harness.test = harness.test.bind(harness);
    harness.test.stream = output;
    harness.plan = harness.plan.bind(harness);
    
    harness.on('childEnd', function (child) {
        output.write(child.conf.name || '(unnamed test)')
        harness.results.list.forEach(function (res) {
            output.write(res)
        });
        harness.results.list.length = 0
    });
    
    var streamEnded = false;
    harness.on('end', function () {
        if (!streamEnded) {
            harness.results.list.forEach(function (res) {
                output.write(res);
            });
            harness.results.list.length = 0;
            output.end();
            streamEnded = true;
        }
    });
    
    harness.on('log', function (msg) {
        output.write({ 'log' : msg });
    });
    
    /*
    process.on('unhandledException', function (e) {
        harness.bailout('unhandled exception: ' + e.message)
    })
    */
    
    return harness;
};
