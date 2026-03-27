

const { disposer } = require('./promises');
const EventEmitter = require('events').EventEmitter;

class RunTimeout {
  constructor(timeout) {
    this.timeout = timeout;
  }

  static with(timeout) {
    let runTimeout = new RunTimeout(timeout);

    return disposer(runTimeout.start(), () => runTimeout.stop());
  }

  start() {
    let self = this;

    if (this.timeout) {
      this.timeoutID = setTimeout(() => {
        self.setTimedOut();
      }, this.timeout * 1000);
    }

    return Promise.resolve(this);
  }

  setTimedOut() {
    this.timedOut = true;
    this.emit('timeout');
  }

  stop() {
    clearTimeout(this.timeoutID);
    this.timeoutID = null;
    this.timedOut = null;
  }

  try(fn) {
    if (this.timedOut) {
      return Promise.reject(new Error('Run timed out.'));
    }

    return fn();
  }
}

RunTimeout.prototype.__proto__ = EventEmitter.prototype;

module.exports = RunTimeout;
