var Harness = require('tap/lib/tap-harness');
var Test = require('./test');
var TapProducer = require('tap/lib/tap-producer');

module.exports = function () {
    var harness = new Harness(Test);
    harness.test = harness.test.bind(harness);
    harness.plan = harness.plan.bind(harness);
    
    var output = this.output = new TapProducer;
    output.pipe(process.stdout);
    
    harness.on('childEnd', function (child) {
        output.write(child.conf.name || '(unnamed test)')
        harness.results.list.forEach(function (res) {
            output.write(res);
        });
        harness.results.list.length = 0
    });
    
    var streamEnded = false
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
        process.stdout.write(String(msg).split('\n')
            .map(function (x) { return '>> ' + x })
            .join('\n') + '\n'
        );
    });
    
    process.on('unhandledException', function (e) {
        harness.bailout('unhandled exception: ' + e.message)
    });
    return harness
};
