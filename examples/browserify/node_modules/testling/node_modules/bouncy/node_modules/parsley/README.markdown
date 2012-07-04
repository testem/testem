parsley
=======

HTTP parser written in node with hooks into the raw header and raw body.

You should only need this module if you're writing an HTTP proxy or something
similarly nefarious.

[![build status](https://secure.travis-ci.org/substack/node-parsley.png)](http://travis-ci.org/substack/node-parsley)

example
=======

headers.js
----------

````javascript
var parsley = require('parsley');
var net = require('net');

net.createServer(function (stream) {
    parsley(stream, function (req) {
        req.on('headers', function (headers) {
            console.log(req.method + ' ' + req.url + 'HTTP/' + req.httpVersion);
            console.dir(headers);
        });
    });
}).listen(7000);
````

````
$ curl localhost:7000/zing
^C
$ 
````

````
$ node example/headers.js 
GET /zingHTTP/1.1
{ 'user-agent': 'curl/7.21.3 (x86_64-pc-linux-gnu) libcurl/7.21.3 OpenSSL/0.9.8o zlib/1.2.3.4 libidn/1.18',
  host: 'localhost:7000',
  accept: '*/*' }

````

raw.js
------

````javascript
var parsley = require('parsley');
var net = require('net');

net.createServer(function (stream) {
    parsley(stream, function (req) {
        var head = [];
        req.on('rawHead', function (buf) {
            head.push(buf);
        });
        
        var body = [];
        req.on('rawBody', function (buf) {
            body.push(buf);
        });
        
        req.on('end', function () {
            console.dir(head.map(String));
            console.dir(body.map(String));
        });
    });
}).listen(7000);
````

````
$ echo beep | curl -sNT. localhost:7000
^C
$ 
````

````
$ node example/raw.js 
[ 'PUT ',
  '/ ',
  'HTTP/',
  '1.1\r\n',
  'User-Agent:',
  ' curl/7.21.3 (x86_64-pc-linux-gnu) libcurl/7.21.3 OpenSSL/0.9.8o zlib/1.2.3.4 libidn/1.18\r\n',
  'Host:',
  ' localhost:7000\r\n',
  'Accept:',
  ' */*\r\n',
  'Transfer-Encoding:',
  ' chunked\r\n',
  'Expect:',
  ' 100-continue\r\n',
  '\r\n' ]
[ '5\r\n', 'beep\n', '\r\n', '0\r\n', '\r\n' ]

````

methods
=======

var parsley = require('parsley')

var p = parsley(stream, cb)
---------------------------

Parse `stream`, calling `cb` with a new `http.IncomingMessage`
object as soon as the first piece of data comes in.

If the connection is keep-alive, multiple requests may come through `cb` on the
same stream.

p.upgrade()
-----------

Put the parser into upgrade mode manually. This is done automatically when the
"upgrade" header is present or "connection: upgrade".

events
======

The `http.IncomingMessage` that `cb` gets called with has these events:

"data", buf
-----------

Emitted when data comes in not including the extra pieces like transfer-encoding
framing.

"headers", headers
------------------

Emitted when all the `req.headers` have arrived.

"end"
-----

Emitted when all the request data has been received, not including trailing
framing such as the last newline.

"rawHead", buf
--------------

Emitted whenever any data comes in before the body.

"rawBody", buf
--------------

Emitted whenever any data comes in after the header but before the request ends
for the case of keep-alive requests.

"rawEnd"
--------

Emitter when the request is complete, including any trailing framing.

"error", err
------------

Emitted when the stream fails to parse.

motivation
==========

Turns out, it's super hard to get node's http parser to spit out the raw request
buffers only for a particular request. But with parsley, you can listen on
`'rawHead'` and `'rawBody'` events to get the raw buffer stream as it gets
parsed.

install
=======

With [npm](http://npmjs.org) do:

    npm install parsley
