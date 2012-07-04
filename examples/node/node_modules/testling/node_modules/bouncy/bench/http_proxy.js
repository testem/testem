var httpProxy = require('http-proxy');

module.exports = function (port) {
    return httpProxy.createServer(port, 'localhost');
};
