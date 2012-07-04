#!/usr/bin/env node
var configFile = process.argv[2];
var port = parseInt(process.argv[3], 10);

if (!configFile || !port) {
    console.error('Usage: bouncy [routes.json] [port]');
    process.exit(1);
}

var fs = require('fs');
var config = JSON.parse(fs.readFileSync(configFile));

var bouncy = require('bouncy');
bouncy(function (req, bounce) {
    var host = (req.headers.host || '').replace(/:\d+$/, '');
    var route = config[host] || config[''];
    
    if (Array.isArray(route)) {
        // jump to a random route on arrays
        route = route[Math.floor(Math.random() * route.length)];
    }
    
    req.on('error', onerror);
    function onerror (err) {
        var res = bounce.respond();
        res.statusCode = 500;
        res.end('error\r\n');
    }
    
    if (typeof route === 'string') {
        var s = route.split(':');
        if (s[1]) {
            bounce(s[0], s[1]).on('error', onerror);
        }
        else {
            bounce(s).on('error', onerror);
        }
    }
    else if (route) {
        bounce(route).on('error', onerror);
    }
    else {
        var res = bounce.respond();
        res.statusCode = 404;
        res.write('no such host');
        res.end();
    }
}).listen(port);
