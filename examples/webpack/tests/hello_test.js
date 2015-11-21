var test = window.tape = require('tape');
setTimeout(function() {
    test('constructor', function(t) {
        t.pass('yahoo');
        t.end();
    });
}, 500);
