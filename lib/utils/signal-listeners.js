

const { disposer } = require('./promises');
const EventEmitter = require('events').EventEmitter;

class SignalListeners extends EventEmitter {
  static with() {
    let signalListeners = new this();

    return disposer(signalListeners.add(), () => signalListeners.remove());
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

  return Promise.resolve(this);
};

SignalListeners.prototype.remove = function() {
  if (this._boundSigInterrupt) {
    process.removeListener('SIGINT', this._boundSigInterrupt);
  }
  if (this._boundSigTerminate) {
    process.removeListener('SIGTERM', this._boundSigTerminate);
  }

  return Promise.resolve();
};

module.exports = SignalListeners;
