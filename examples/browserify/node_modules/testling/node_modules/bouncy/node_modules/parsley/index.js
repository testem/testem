module.exports = function (stream, cb) {
    return new Parser(stream, cb);
};

function Parser (stream, cb) {
    var self = this;
    self.stream = stream;
    self.cb = cb;
    
    self._onData = function (buf) {
        self.execute(buf, 0, buf.length);
    };
    stream.on('data', self._onData);
    
    this.mode = 'begin';
}

Parser.prototype.execute = function (buf, start, len) {
    for (var i = start; i < len && i >= 0; ) {
        i = this.modes[this.mode].call(this, buf, i, len - i);
        if (i < 0) {
            this.stream.removeListener('data', this._onData);
            if (this.request) {
                var err = new Error('error parsing ' + this.mode);
                this.request.emit('error', err);
            }
            break;
        }
    }
};

Parser.prototype.upgrade = function () {
    var self = this;
    if (self.request
    && (self.mode === 'begin' || self.mode === 'method'
    || self.mode === 'url' || self.mode === 'versionBegin'
    || self.mode === 'version' || self.mode === 'headerField'
    || self.mode === 'headerValue')) {
        
        self.mode = 'upgrade';
        self.request.emit('upgrade');
    }
    else if (self.request) {
        self.request.once('headers', function () {
            self.mode = 'upgrade';
            self.request.emit('upgrade');
        });
    }
    else {
        var cb = self.cb;
        self.cb = function () {
            cb.apply(this, arguments);
            self.upgrade();
        };
    }
    
    var ended = false;
    self.stream.on('end', function () {
        if (self.request) self.request.emit('end');
    });
};

Parser.prototype.modes = require('./lib/modes');
