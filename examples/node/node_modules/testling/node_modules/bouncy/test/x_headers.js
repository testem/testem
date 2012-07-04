var test = require('tap').test;
var http = require('http');
var net = require('net');
var bouncy = require('../');

test('check for x-forwarded default headers', function (t) {
    t.plan(6);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s0 = http.createServer(function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('beep boop');
        t.equal(req.headers['x-forwarded-for'], '127.0.0.1');
        t.equal(req.headers['x-forwarded-port'], p1.toString());
        t.equal(req.headers['x-forwarded-proto'], 'http');
        res.end();
    });
    s0.listen(p0, connect);
    
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s1 = bouncy(function (req, bounce) { bounce(p0) });
    s1.listen(p1, connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        var opts = {
            method : 'GET',
            host : 'localhost',
            port : p1,
            path : '/'
        };
        var req = http.request(opts, function (res) {
            t.equal(res.statusCode, 200)
            t.equal(res.headers['content-type'], 'text/plain');
            
            var data = '';
            res.on('data', function (buf) {
                data += buf.toString();
            });
            
            res.on('end', function () {
                t.equal(data, 'beep boop');
                s0.close();
                s1.close();
                t.end();
            });
        });
        req.end();
    }
});
