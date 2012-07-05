var test = require('tap').test;
var bouncy = require('../');
var net = require('net');
var Stream = require('./lib/stream');

test('keep alive', function (t) {
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 1e4)) + 1e4;
    
    var s = bouncy(function (req, bounce) {
        var stream = Stream();
        bounce(stream);
        
        stream.write([
            'HTTP/1.1 200 OK',
            'Content-Type: text/plain',
            '',
            'host=' + req.headers.host,
            ''
        ].join('\r\n'));
    });
    
    s.listen(port, function () {
        var hosts = [ 'first', 'second' ];
        var c = net.createConnection(port, function () {
            c.write([
                'GET / HTTP/1.1', // implicit keep-alive in 1.1
                'Host: first',
                '',
                ''
            ].join('\r\n'));
            
            var line = '';
            c.on('data', function (buf) {
                for (var i = 0; i < buf.length; i++) {
                    if (buf[i] === '\n'.charCodeAt(0)) {
                        var h = line.match(/^host=(\S+)/);
                        if (h) {
                            t.equal(h[1], hosts.shift());
                            if (h[1] === 'first') {
                                c.write([
                                    'GET / HTTP/1.1',
                                    'Host: second',
                                    '',
                                    ''
                                ].join('\r\n'));
                            }
                            else if (h[1] === 'second') {
                                s.close();
                                c.end();
                                t.end();
                            }
                            else {
                                t.fail(h[1]);
                            }
                        }
                        line = '';
                    }
                    else line += String.fromCharCode(buf[i]);
                }
            });
        });
    });
});
