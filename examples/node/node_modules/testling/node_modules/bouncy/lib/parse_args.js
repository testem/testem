var net = require('net');

module.exports = function (args) {
    var opts = {};
    
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        var m;
        
        if (typeof arg === 'number') {
            opts.port = arg;
        }
        else if (typeof arg === 'string') {
            if (/^\d+$/.test(arg)) {
                opts.port = parseInt(arg, 10);
            }
            else if (/^\.?\//.test(arg)) {
                opts.unix = arg;
            }
            else if ((m = arg.match(
                /^(?:http:\/\/)?([^:\/]+)?(?::(\d+))?(\/.*)?$/
            )) && (m[1] || m[2] || m[3])) {
                opts.host = m[1] || 'localhost';
                opts.port = m[2] || 80;
                if (m[3]) opts.path = m[3];
            }
            else opts.host = arg;
        }
        else if (typeof arg === 'object') {
            if (arg.write) opts.stream = arg;
            else {
                for (var key in arg) {
                    opts[key] = arg[key]
                }
            }
        }
    }
    
    if (!opts.stream) {
        if (opts.unix) {
            opts.stream = net.createConnection(opts.unix);
        }
        else if (opts.host && opts.port) {
            opts.stream = net.createConnection(opts.port, opts.host);
        }
        else if (opts.port) {
            opts.stream = net.createConnection(opts.port);
        }
    }
    
    return opts;
}
