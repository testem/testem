const EventEmitter = require('events');

class Log extends EventEmitter {
  constructor() {
    super();
    this.stream = process.stderr;
  }

  formatRecord(level, args) {
    let prefix = '';
    let message = '';

    if (args.length === 1) {
      message = args[0];
    } else if (args.length >= 2) {
      prefix = args[0] || '';
      message = args.slice(1).join(' ');
    }

    return {
      level,
      prefix,
      message: String(message)
    };
  }

  write(record) {
    if (this.stream && typeof this.stream.write === 'function') {
      this.stream.write(record.message + '\n');
    }
  }

  emitLog(level, args) {
    const record = this.formatRecord(level, args);

    this.emit(`log.${level}`, record);
    this.write(record);
  }

  error(...args) {
    this.emitLog('error', args);
  }

  notice(...args) {
    this.emitLog('notice', args);
  }

  warn(...args) {
    this.emitLog('warn', args);
  }

  info(...args) {
    this.emitLog('info', args);
  }

  verbose(...args) {
    this.emitLog('verbose', args);
  }

  http(...args) {
    this.emitLog('http', args);
  }

  silly(...args) {
    this.emitLog('silly', args);
  }

  timing(...args) {
    this.emitLog('timing', args);
  }

  pause() {
    this.emit('log.pause');
  }

  resume() {
    this.emit('log.resume');
  }
}

module.exports = new Log();
