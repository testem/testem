var test = require('tap').test;
var parsley = require('../');
var chunky = require('chunky');
var Stream = require('net').Stream;

test('post length', function (t) {
    t.plan(50 * 3);
    var pending = 50;
    
    Array(50+1).join('x').split('').forEach(function () {
        var stream = new Stream;
        stream.readable = true;
        
        parsley(stream, function (req) {
            req.on('headers', function (headers) {
                t.equal(req.url, '/hooray');
                
                t.deepEqual(headers, {
                    host : 'beep.boop',
                    'content-length' : 7,
                });
            });
            
            var data = '';
            req.on('data', function (buf) {
                data += buf.toString();
            });
            
            req.on('end', function () {
                t.equal(data, 'abcdefg');
                
                if (--pending === 0) {
                    t.end();
                }
            });
        });
        
        var msg = new Buffer([
            'POST /hooray HTTP/1.1',
            'Host: beep.boop',
            'Content-Length: 7',
            '',
            'abcdefg'
        ].join('\r\n'));
        
        var chunks = chunky(msg);
        var iv = setInterval(function () {
            stream.emit('data', chunks.shift());
            if (chunks.length === 0) {
                stream.emit('end');
                clearInterval(iv);
            }
        }, 10);
    });
});
