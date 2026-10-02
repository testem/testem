

const EventEmitter = require('events').EventEmitter;

class RunTimeout {
  constructor(timeout) {
    this.timeout = timeout;
  }

  static async with(timeout, fn) {
    let runTimeout = new RunTimeout(timeout);
    runTimeout.start();

    try {
      return await fn(runTimeout);
    } finally {
      runTimeout.stop();
    }
  }

  start() {
    if (this.timeout) {
      this.timeoutID = setTimeout(() => {
        this.setTimedOut();
      }, this.timeout * 1000);
    }
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

  async try(fn) {
    if (this.timedOut) {
      throw new Error('Run timed out.');
    }

    return fn();
  }
}

RunTimeout.prototype.__proto__ = EventEmitter.prototype;

module.exports = RunTimeout;
