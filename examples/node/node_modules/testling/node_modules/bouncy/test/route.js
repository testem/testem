var test = require('tap').test;
var http = require('http');
var net = require('net');
var bouncy = require('../');

test('bounce', function (t) {
    var iters = 50;
    t.plan(4 * iters);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s0 = http.createServer(function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('beep!');
        res.end();
    });
    s0.listen(p0, connect);
    
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s1 = http.createServer(function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('boop!');
        res.end();
    });
    s1.listen(p1, connect);
    
    var p2 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s2 = bouncy(function (req, bounce) {
        if (req.headers.host === 'beep.example.com') {
            var s = bounce(p0);
            t.ok(s instanceof net.Stream, 'bounce() returns a stream');
        }
        else if (req.headers.host === 'boop.example.com') {
            var s = bounce(p1);
            t.ok(s instanceof net.Stream, 'bounce() returns a stream');
        }
        else {
            t.fail(req.headers.host);
        }
    });
    s2.listen(p2, connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 3) return;
        for (var i = 0; i < iters; i++) {
            request([ 'beep', 'boop' ][Math.floor(Math.random() * 2)]);
        }
    }
    
    var pending = iters;
    function request (name) {
        var opts = {
            method : 'GET',
            host : 'localhost',
            headers : { host : name + '.example.com' },
            port : p2,
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
                t.equal(data, name + '!');
                
                if (--pending === 0) {
                    s0.close();
                    s1.close();
                    s2.close();
                    t.end();
                }
            });
        });
        req.end();
    }
});
