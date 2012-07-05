var bouncy = require('../');

module.exports = function (port) {
    return bouncy(function (req, bounce) { bounce(port) });
};
