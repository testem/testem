var test = require('tap').test;
var parsley = require('../');
var chunky = require('chunky');
var Stream = require('net').Stream;

test('raw post chunk', function (t) {
    var pending = 50;
    t.plan(pending * 4);
    
    Array(pending + 1).join('x').split('').forEach(function () {
        var stream = new Stream;
        stream.readable = true;
        
        parsley(stream, function (req) {
            var rh = [], rb = [];
            
            req.on('rawHead', function (buf) {
                rh.push(buf);
            });
            
            req.on('rawBody', function (buf) {
                rb.push(buf);
            });
            
            req.on('headers', function (headers) {
                t.equal(req.url, '/beep');
                
                t.deepEqual(headers, {
                    'transfer-encoding' : 'chunked'
                });
            });
            
            req.on('rawEnd', function () {
                t.equal(
                    rh.map(String).join(''),
                    [
                        'POST /beep HTTP/1.1',
                        'Transfer-Encoding: CHUNKED',
                        '',
                        ''
                    ].join('\r\n')
                );
                t.equal(
                    rb.map(String).join(''),
                    [
                        '3',
                        'abc',
                        '7',
                        'defhijk',
                        '0',
                        '',
                        ''
                    ].join('\r\n')
                );
                
                if (--pending === 0) {
                    t.end();
                }
            });
        });
        
        var msg = new Buffer([
            'POST /beep HTTP/1.1',
            'Transfer-Encoding: CHUNKED',
            '',
            '3',
            'abc',
            '7',
            'defhijk',
            '0',
            '',
            ''
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
