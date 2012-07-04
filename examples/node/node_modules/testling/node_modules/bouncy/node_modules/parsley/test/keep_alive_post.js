var test = require('tap').test;
var parsley = require('../');
var chunky = require('chunky');
var Stream = require('net').Stream;

test('keep-alive post', function (t) {
    var pending = 50;
    t.plan(pending * 3 * 3);
    var reqs = [
        {
            url : '/first',
            headers : {
                host : 'first.beep',
                'transfer-encoding' : 'chunked',
            },
            data : 'abcde',
        },
        {
            url : '/second',
            headers : {
                host : 'second.beep',
                'content-length' : 10,
            },
            data : '0123456789',
        },
        {
            url : '/third',
            headers : {
                host : 'third.beep',
                'transfer-encoding' : 'chunked',
            },
            data : 'zyxwvutsrq',
        },
    ];
    
    Array(pending + 1).join('x').split('').forEach(function () {
        var stream = new Stream;
        stream.readable = true;
        
        var i = 0;
        parsley(stream, function (req) {
            var rb = [];
            
            var data = '';
            req.on('data', function (buf) {
                data += buf.toString();
            });
            
            req.on('end', function () {
                var r = reqs[i];
                t.equal(req.url, r.url);
                t.deepEqual(req.headers, r.headers);
                t.equal(data, r.data);
                
                if (++i === 3) {
                    if (--pending === 0) t.end();
                }
            });
        });
        
        var msg = new Buffer([
            'POST /first HTTP/1.1',
            'Host: first.beep',
            'Transfer-Encoding: chunked',
            '',
            '2',
            'ab',
            '3',
            'cde',
            '0',
            '',
            'POST /second HTTP/1.1',
            'Host: second.beep',
            'Content-Length: 10',
            '',
            '0123456789POST /third HTTP/1.1',
            'Host: third.beep',
            'Transfer-Encoding: chunked',
            '',
            'a',
            'zyxwvutsrq',
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
