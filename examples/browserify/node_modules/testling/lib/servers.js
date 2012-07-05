var insertProxy = require('./proxy');
var producer = require('./producer');

module.exports = function (opts, cb) {
    var bundle = require('../lib/bundle')(opts.files);
    var script = '<script src="'
        + 'http://' + opts.server + '/proxy.js'
        + '"></script>'
    ;
    
    var servers = {};
    servers.proxy = insertProxy(script, [ 'http://' + opts.server ]);
    servers.web = (function () {
        var http = require('http');
        var ecstatic = require('ecstatic')(__dirname + '/../static');
        return http.createServer(function (req, res) {
            if (req.url.split('?')[0] === '/') {
                res.setHeader('content-type', 'text/html');
                res.end('<!DOCTYPE html>' +
                    '<html><head>' +
                        '<meta http-equiv="Content-Type" ' +
                        'content="text/html; charset=UTF-8">' +
                        '<title>Testling tests</title>' +
                        '<script>' + bundle + '</script>' +
                    '</head><body></body></html>');
            }
            else ecstatic(req, res)
        });
    })();
    var JSONStream = require('JSONStream');
    var shoe = require('shoe');
    var sock = shoe(function (stream) {
        stream
            .pipe(JSONStream.parse([ true ]))
            .pipe(producer())
            .on('end', function () {
                if (opts.headless) {
                    process.exit();
                }
            })
            .pipe(process.stdout, { end : false })
        ;
    });
    sock.install(servers.web, '/push');
    var pending = 2;
    var ports = {
        proxy : parseInt(opts.proxy.split(':')[1], 10),
        server : parseInt(opts.server.split(':')[1], 10),
    };
    var uri = 'http://localhost:' + ports.server + '/?' + Math.random();
    
    servers.proxy.listen(ports.proxy, onready);
    servers.web.listen(ports.server, onready);
    
    function onready () {
        if (--pending === 0) cb(uri, ports, servers);
    }
};
