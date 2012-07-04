var test = require('tap').test;
var insertHeaders = require('../lib/insert_headers');

test('insert headers', function (t) {
    t.plan(50 * 3);
    var msg = [
        'POST / HTTP/1.1',
        'Host: beep',
        '',
        'sound=boop'
    ].join('\r\n');
    
    for (var i = 0; i < 50; i++) {
        var bufs = splitUp(msg);
        t.equal(bufs.map(String).join(''), msg);
        
        var bufs_ = bufs.slice();
        
        var n = insertHeaders(bufs, { foo : 'bar', baz : 'quux' });
        t.equal(n, 'foo: bar\r\nbaz: quux\r\n'.length);
        t.ok(
            bufs.length === bufs_.length + 2
            || bufs.length === bufs_.length + 3
        );
    }
    t.end();
});

function splitUp (msg) {
    var bufs = [];
    for (
        var i = 0, j = Math.floor(Math.random() * (msg.length + 1));
        j <= msg.length;
        j += Math.floor(Math.random() * (msg.length - j + 1))
    ) {
        var s = msg.slice(i, j);
        bufs.push(new Buffer(s));
        i = j;
        if (j === msg.length) break;
    }
    
    return bufs;
}
