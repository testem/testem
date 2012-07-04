var http = require('http');
var bouncy = require('bouncy');
var Stream = require('stream');

module.exports = function (insert, skip) {
    if (!Buffer.isBuffer(insert)) insert = new Buffer(insert);
    skip = skip.map(function (s) { return s.replace(/\/*$/, '/') });
    
    var server = bouncy(function (req, bounce) {
        return createServer.call(server, insert, skip, req, bounce);
    });
    var log = server.log = new Stream;
    log.readable = true;
    
    server.on('close', function () { log.emit('end') });
    return server;
};

function createServer (insert, skip, req, bounce) {
    var server = this;
    
    server.log.emit('data', {
        method : req.method,
        url : req.url,
        headers : req.headers,
        data : req
    });
    
    if (req.method === 'CONNECT') {
        bounce.reset();
        bounce.upgrade();
        
        var stream = bounce(req.url);
        stream.on('connect', function () {
            stream.emit('data', 'HTTP/1.1 200 OK\r\n\r\n');
        });
        return;
    }
    
    var res = bounce.respond();
    
    req.headers['accept-encoding'] = 'none';
    req.headers.connection = 'close';
    req.headers['proxy-connection'] = 'close';
    
    var m = req.url.match(/^http:\/\/([^:\/]+)(?::(\d+))?(\/.*|)/);
    if (!m) return res.end();
    
    var r = http.request({
        method : req.method,
        host : m[1],
        port : Number(m[2] || 80),
        path : m[3],
        headers : req.headers,
    });
    req.pipe(r);
    
    r.on('error', function (err) {
        //console.dir(err);
    });
    res.on('error', function (err) {
        //console.dir(err);
    });
    
    r.on('response', function (res_) {
        res_.on('error', function (err) {
            //console.dir(err);
        });
        
        if (!res_.headers.upgrade
        && skip.every(function (site) {
            return req.url.slice(0, site.length) !== site
        })
        && /^text\/x?html/.test(res_.headers['content-type'])) {
            var headers = Object.keys(res_.headers)
                .reduce(function (acc, key) {
                    acc[key] = res_.headers[key];
                    return acc;
                }, {})
            ;
            if (headers['content-length']) {
                headers['content-length'] += insert.length;
            }
            delete headers.etag;
            delete headers['last-modified'];
            delete headers['cache-control'];
            delete headers['x-xss-protection'];
            delete headers['x-frame-options'];
            
            res.writeHead(res_.statusCode, headers);
            res.write(insert);
        }
        else {
            res.writeHead(res_.statusCode, res_.headers);
        }
        
        res_.on('data', function (buf) {
            res.write(buf);
        });
        res_.on('end', function () {
            res.end();
        });
    });
};
