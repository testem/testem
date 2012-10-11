var test = require('tap').test;
var hello = require('./hello');

test('it says hello?', function(t){
    t.equal(hello(), 'hello world');
    t.end();
});