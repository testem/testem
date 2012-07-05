var sockjs = require('sockjs');

exports = module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    var server = sockjs.createServer();
    if (typeof cb === 'function') {
        server.on('connection', cb);
    }
    server.install = function (httpServer, hopts) {
        if (hopts && hopts.listen && !httpServer.listen) {
            httpServer = arguments[1];
            hopts = arguments[0];
        }
        if (typeof hopts === 'string') {
            hopts = { prefix : hopts };
        }
        if (!hopts) hopts = {};
        if (hopts.log === undefined) {
            // spamming stdout by default is VERY infuriating,
            // emit an event instead
            hopts.log = function (severity, line) {
                server.emit('log', severity, line);
            };
        }
        server.installHandlers(httpServer, hopts);
    };
    
    return server;
};

Object.keys(sockjs).forEach(function (key) {
    exports[key] = sockjs[key];
});
