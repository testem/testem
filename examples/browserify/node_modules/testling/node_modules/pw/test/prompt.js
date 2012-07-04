var pw = require('../');
var test = require('tap').test;
var EventEmitter = require('events').EventEmitter;

test('prompt', function (t) {
    t.plan(2);
    
    var data = '';
    var stream = {
        in : new EventEmitter,
        out : {
            writable : true,
            write : function (buf) {
                data += buf.toString()
            }
        }
    };
    stream.in.readable = true;
    
    pw(stream.in, stream.out, function (pass) {
        t.equal(pass, 'beep');
        t.equal(data, '****\r\n');
        t.end();
    });
    
    stream.in.emit('data', new Buffer('beep\r\n'));
});
