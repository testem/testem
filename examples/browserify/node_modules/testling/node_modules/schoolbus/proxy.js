var $ = require('jquery-browserify');
var json = typeof JSON === 'object' ? JSON : require('jsonify');
var proto = require('dnode-protocol');
var bus = require('postmessage');

function copyLocation () {
    var keys = [
        'hash', 'host', 'hostname', 'href', 'origin', 'pathname', 'port',
        'protocol', 'search'
    ];
    var res = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        res[key] = window.location[key];
    }
    return res;
}

var client = proto(function (remote, conn) {
    this.location = copyLocation();
    
    this.run = function (src, vars) {
        if (!vars) vars = {};
        var args = [], names = [];
        for (var key in vars) {
            names.push(key);
            args.push(vars[key]);
        }
        $(function () {
            var fn = Function(names, 'return ' + src);
            fn.apply(null, args)(window, $);
        });
    };
}).create();

client.on('request', function (req) {
    bus.postMessage(
        json.stringify([ '__testling_message', req ]),
        '*',
        window.parent
    );
});

if (window.parent !== window) {
    bus.receiveMessage(function (ev) {
        try {
            var msg = json.parse(ev.data);
            if (msg[0] === '__testling_message') client.handle(msg[1]);
        }
        catch (err) {}
    });
    
    bus.postMessage(
        json.stringify([ '__testling_open', copyLocation() ]),
        '*', window.parent
    );
    client.start();
}
