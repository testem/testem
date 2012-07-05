var test = require('tap').test;
var bouncy = require('../');
var net = require('net');
var EventEmitter = require('events').EventEmitter;

test('drop a socket', function (t) {
    t.plan(2);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    
    var s0 = bouncy(function (req, bounce) {
        t.equal(req.headers.host, 'lulzy');
        
        var c = net.createConnection(p1, function () {
            c.destroy();
            var emitter = new EventEmitter;
            
            emitter.on('drop', function (c) {
                process.nextTick(function () {
                    s0.close();
                    s1.close();
                    c.destroy();
                    t.end();
                });
            });
            
            t.doesNotThrow(
                function () { bounce(c, { emitter : emitter }) },
                'bounce should not throw when the connection is closed'
            );
        });
    });
    
    s0.listen(p0, function () {
        var c = net.createConnection(p0, function () {
            write('GET /lul HT');
            
            setTimeout(function () {
                write('TP/1.1\r\nHo');
            }, 20);
            setTimeout(function () {
                write('st: lulz');
            }, 40);
            setTimeout(function () {
                write('y\r\nFoo: bar');
            }, 60);
            setTimeout(function () {
                write('\r\n\r\n');
            }, 80);
        });
        
        c.on('error', function () {});
        
        function write (msg) {
            try { c.write(msg) }
            catch (err) {}
        }
    });
    
    var s1 = net.createServer();
    s1.listen(p1);
});
