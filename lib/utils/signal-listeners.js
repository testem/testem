

const EventEmitter = require('events').EventEmitter;

class SignalListeners extends EventEmitter {
  static async with(fn) {
    let signalListeners = new this();
    signalListeners.add();

    try {
      return await fn(signalListeners);
    } finally {
      signalListeners.remove();
    }
  }
}

SignalListeners.prototype.add = function() {
  this._boundSigInterrupt = () => {
    this.emit('signal', new Error('Received SIGINT signal'));
  };

  process.on('SIGINT', this._boundSigInterrupt);

  this._boundSigTerminate = () => {
    this.emit('signal', new Error('Received SIGTERM signal'));
  };
  process.on('SIGTERM', this._boundSigTerminate);
};

SignalListeners.prototype.remove = function() {
  if (this._boundSigInterrupt) {
    process.removeListener('SIGINT', this._boundSigInterrupt);
  }
  if (this._boundSigTerminate) {
    process.removeListener('SIGTERM', this._boundSigTerminate);
  }
};

module.exports = SignalListeners;
