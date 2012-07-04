var headless = require('headless');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var argue = {};
argue.firefox = function (br, uri, opts, cb) {
    var prefs = '';
    if (opts.proxy) {
        var m = /^(?:http:\/\/)?([^:\/]+)(?::(\d+))?/.exec(opts.proxy);
        var host = JSON.stringify(m[1]);
        var port = m[2] || 80;
        prefs += [
            '"network.proxy.http", ' + host,
            '"network.proxy.http_port", ' + port,
            '"network.proxy.type", 1',
            '"browser.cache.disk.capacity", 0',
            '"browser.cache.disk.smart_size.enabled", false',
            '"browser.cache.disk.smart_size.first_run", false',
            '"network.proxy.no_proxies_on", '
                + JSON.stringify(opts.noProxy || '')
            ,
        ].map(function (x) { return 'user_pref(' + x + ');\n' }).join('');
    }
    
    var file = path.join(path.dirname(br.profile.file), 'user.js');
    fs.writeFile(file, prefs, function (err) {
        if (err) cb(err)
        else cb(null, [
            '-no-remote',
            '-P', br.profile.name,
            uri,
        ])
    });
};

argue.chrome = function (br, uri, opts, cb) {
    cb(null, [
        opts.proxy ? '--proxy-server=' + opts.proxy : null,
        br.profile ? '--user-data-dir=' + br.profile : null,
        '--incognito',
        uri,
    ].filter(Boolean));
};

argue.phantom = function (br, uri, opts, cb) {
    // `phantomjs uri` would be TOO EASY I guess?
    var file = path.join(br.profile, 'phantom.js');
    var src = '(new WebPage).open('
        + JSON.stringify(uri)
        + ',function(){})'
    ;
    fs.writeFile(file, src, function (err) {
        if (err) cb(err)
        else cb(null, [
            opts.proxy ?
                '--proxy=' + opts.proxy.replace(/^http:\/\//, '')
                : null
            ,
            file
        ].filter(Boolean))
    });
};

module.exports = function (config, name, version) {
    var m = selectMatch(config, name, version);
    if (!m) return;
    return function (uri, opts, cb) {
        if (opts.headless && !m.headless) {
            headless(function (err, proc, display) {
                run({ DISPLAY : ':' + display });
            });
        }
        else run({})
        
        function run (env_) {
            var env = {};
            Object.keys(process.env).forEach(function (key) {
                env[key] = process.env[key];
            });
            Object.keys(env_).forEach(function (key) {
                env[key] = env_[key];
            });
            
            argue[m.type](m, uri, opts, function (err, args) {
                if (err) return cb(err);
                if (opts.noProxy && env.no_proxy === undefined) {
                    env.no_proxy = opts.noProxy;
                }
                if (opts.proxy && env.http_proxy === undefined) {
                    env.http_proxy = opts.proxy;
                }
                if (opts.proxy && env.HTTP_PROXY === undefined) {
                    env.HTTP_PROXY = opts.proxy;
                }
                
                cb(null, spawn(m.command, args, { env : env }))
            });
        }
    };
};

function selectMatch (config, name, version) {
    var order = (config.preference || []).concat(Object.keys(config.browsers));
    for (var i = 0; i < order.length; i++) {
        var bs = config.browsers[order[i]];
        var matching = bs
            .filter(function (b) {
                return b.name === name
                    && matches(b.version, version)
                ;
            })
            .sort(function (a, b) {
                return b.version - a.version;
            })
        ;
        if (matching.length) return matching[0];
    }
}

function matches (version, pattern) {
    if (pattern === undefined || pattern === '*') return true;
    
    // todo: real semvers
    var vs = version.split('.');
    var ps = pattern.split('.');
    for (var i = 0; i < ps.length; i++) {
        if (ps[i] === 'x' || ps[i] === '*') continue;
        if (ps[i] !== vs[i]) return false;
    }
    return true;
}
