var test = require('tap').test;
var bouncy = require('../');
var net = require('net');
var Stream = net.Stream;
var chunky = require('chunky');

test('connect reset', function (t) {
    var times = 50;
    t.plan(times);
    var msg = new Buffer([
        'CONNECT beep.boop:54321 HTTP/1.1',
        'Host: beep.boop:54321',
        '',
        'beepity',
        'boop'
    ].join('\r\n'));
    
    var port = Math.floor(Math.random() * 1e5 + 5e5);
    
    (function next () {
        var chunks = chunky(msg);
        var server = bouncy(function (req, bounce) {
            bounce.upgrade();
            bounce.reset();
            
            var stream = new Stream;
            stream.readable = true;
            stream.writable = true;
            
            var data = '';
            stream.write = function (buf) { data += buf };
            stream.end = function () {
                t.equal(data, 'beepity\r\nboop');
                server.close();
                if (--times === 0) t.end();
                else next();
            };
            
            bounce(stream);
        });
        server.listen(port, function () {
            var stream = net.createConnection(port);
            
            var iv = setInterval(function () {
                var c = chunks.shift();
                if (c.length) stream.write(c);
                
                if (chunks.length === 0) {
                    stream.end();
                    clearInterval(iv);
                }
            }, 1);
        });
    })();
});
