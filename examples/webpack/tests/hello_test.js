var test = window.tape = require('fresh-tape');
test('constructor', async function(t) {
    await new Promise(function(resolve) { setTimeout(resolve, 500); });
    t.pass('yahoo');
});
