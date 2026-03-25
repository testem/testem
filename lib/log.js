const EventEmitter = require('events');
const procLog = require('proc-log').log;

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

    if (procLog && typeof procLog[level] === 'function') {
      procLog[level](...args);
    }
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
    if (procLog && typeof procLog.pause === 'function') {
      procLog.pause();
    }
  }

  resume() {
    this.emit('log.resume');
    if (procLog && typeof procLog.resume === 'function') {
      procLog.resume();
    }
  }
}

module.exports = new Log();
