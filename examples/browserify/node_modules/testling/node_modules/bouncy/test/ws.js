var test = require('tap').test;
var bouncy = require('../');
var ws = require('websocket-server');
var wc = require('wsclient');

test('ws', function (t) {
    t.plan(4);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s0 = ws.createServer();
    s0.on('connection', function (c) {
        var msgs = [ 'beepity', 'boop' ];
        c.on('message', function (msg) {
            t.equal(msg, msgs.shift());
            c.send(msg.split('').reverse().join(''));
            if (msgs.length === 0) c.close();
        });
    });
    
    s0.listen(p0, connect);
    
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s1 = bouncy(function (req, bounce) {
        bounce(p0);
    });
    s1.listen(p1, connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        
        var c = wc.websocket('ws://localhost:' + p1 + '/');
        c.connect();
        
        c.on('open', function () {
            c.send('beepity');
            setTimeout(function () {
                c.send('boop');
            }, 15);
        });
        
        c.on('close', function () {
            s0.close();
            s1.close();
            t.end();
        });
        
        var msgs = [ 'ytipeeb', 'poob' ];
        c.on('message', function (buf) {
            t.equal(buf.toString(), msgs.shift());
        });
    }
});
