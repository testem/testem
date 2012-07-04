var Test = require('tap/lib/tap-test');
var inherits = require('util').inherits;
var schoolbus = require('schoolbus');

inherits(Testling, Test);
module.exports = Testling;

function Testling (harness, name, conf) {
    Test.apply(this, arguments);
    for (var key in Test.prototype) {
        this[key] = Test.prototype[key].bind(this);
    }
    
    for (var key in Testling.prototype) {
        this[key] = Testling.prototype[key].bind(this);
    }
}

Testling.prototype.createWindow = function () {
    var bus = schoolbus.apply(null, arguments);
    bus.appendTo(document.body);
    return bus;
};

Testling.prototype.log = function (msg) {
    this.harness.emit('log', msg);
};
