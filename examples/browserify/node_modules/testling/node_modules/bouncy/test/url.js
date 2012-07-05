var test = require('tap').test;
var updatePath = require('../lib/update_path');
var chunky = require('chunky');

test('update url', function (t) {
    var times = 50;
    t.plan(times * 2);
    var msg = new Buffer([
        'POST /beepity HTTP/1.1',
        'Host: beep',
        '',
        'sound=boop'
    ].join('\r\n'));
    
    for (var i = 0; i < times; i++) {
        var chunks = chunky(msg);
        
        var n = updatePath(chunks, '/boop');
        t.equal(n, '/beepity'.length - '/boop'.length);
        t.equal(
            chunks.map(String).join(''),
            msg.toString().replace('/beepity', '/boop')
        );
    }
    t.end();
});
