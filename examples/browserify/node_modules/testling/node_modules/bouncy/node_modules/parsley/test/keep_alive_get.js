var test = require('tap').test;
var parsley = require('../');
var chunky = require('chunky');
var Stream = require('net').Stream;

test('keep-alive get', function (t) {
    var pending = 1;
    t.plan(pending * 4);
    
    Array(pending + 1).join('x').split('').forEach(function () {
        var stream = new Stream;
        stream.readable = true;
        
        var i = 0;
        parsley(stream, function (req) {
            var rh = [], rb = [];
            
            req.on('rawHead', function (buf) {
                rh.push(buf);
            });
            
            req.on('rawBody', function (buf) {
                rb.push(buf);
            });
            
            req.on('headers', function (headers) {
                t.equal(req.url, [ '/first', '/second' ][i]);
                
                t.deepEqual(headers, {
                    host : [ 'beep', 'boop' ][i],
                });
            });
            
            req.on('end', function () {
                t.deepEqual(rb, []);
                
                t.equal(
                    rh.map(String).join(''),
                    [
                        'GET ' + req.url + ' HTTP/1.1',
                        'Host: ' + req.headers.host,
                        '',
                        ''
                    ].join('\r\n')
                );
                
                if (++i === 2) {
                    if (--pending === 0) {
                        t.end();
                    }
                }
            });
        });
        
        var msg = new Buffer([
            'GET /first HTTP/1.1',
            'Host: beep',
            '',
            'GET /second HTTP/1.1',
            'Host: boop',
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
