var TapProducer = require('tap/lib/tap-producer');
var util = require('util');

module.exports = function () {
    return new Producer;
};

function Producer () {
    TapProducer.call(this);
}
util.inherits(Producer, TapProducer);

Producer.prototype.write = function (msg) {
    if (msg && typeof msg === 'object' && msg.log) {
        this.emit('data', msg.log
            .split('\n')
            .map(function (line) { return '>> ' + line })
            .join('\n')
            + '\n'
        );
    }
    else TapProducer.prototype.write.call(this, msg);
};
