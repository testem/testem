#!/usr/bin/env node

var launcher = require('browser-launcher');
var testlingVisit = require('../lib/testling/visit');
var createServers = require('../lib/servers');
var fs = require('fs');
var spawn = require('child_process').spawn;

var argv = require('optimist')
    .option('headless', { default : true, type : 'boolean' })
    .default('proxy', 'localhost:54045')
    .default('server', 'localhost:54046')
    .default('browser', 'node')
    .argv
;
if (argv._[0] === 'list') {
    launcher.config.read(function show (err, cfg) {
        if (err) return console.error(err);
        if (!cfg) {
            console.error('# detecting browsers for the first time');
            return launcher.setup(show);
        }
        
        cfg.browsers.local.forEach(function (browser) {
            console.log(browser.name + '/' + browser.version);
        });
    });
    return;
}

argv.files = argv.files || argv._;
if (argv.files.length === 0) {
    fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
    return;
}

var tunnel = require('../lib/testling/tunnel');
if (argv._[0] === 'tunnel') return tunnel(argv.server);

if (argv.browser === 'node') {
    var args = [ __dirname + '/../node_modules/.bin/tap' ]
        .concat(argv.files);
    spawn(process.execPath, args, { customFds : [ 0, 1, 2 ] });
    return;
}

createServers(argv, function (uri, ports, servers) {
    if (argv.browser === 'echo') {
        console.log([
            uri, '  proxy:     localhost:' + ports.proxy
        ].join('\n'));
        return;
    }
    
    if (/^testling\./.test(argv.browser)) {
        if (!tunnel.running) {
            console.error('Tunnel not running. Do `testling tunnel`'
                + ' to start an ssh tunnel first.'
            );
            process.exit(1);
            return;
        }
        var u = uri.replace(/^http:\/\/[^\/]+/, tunnel.config.addr);
        testlingVisit(u, argv, function (err, res) {
            if (err) return console.error(err);
        });
        return;
    }
    
    launcher(function (err, launch) {
        if (err) return console.error(err);
        
        var opts = {
            headless : argv.headless,
            browser : argv.browser,
            version : argv.version,
            proxy : 'localhost:' + ports.proxy,
            noProxy : 'localhost:' + ports.server,
        };
        launch(uri, opts, function (err, ps) {
            if (err) return console.error(err);
            ps.on('exit', function () {
                servers.web.close();
                servers.proxy.close();
            });
        });
    });
});
