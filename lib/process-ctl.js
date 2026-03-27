

const log = require('./log');
const execa = require('execa').execa;
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const spawnargs = require('spawn-args');
const _ = require('lodash');

const envWithLocalPath = require('./utils/env-with-local-path');
const fileutils = require('./utils/fileutils');
const Process = require('./utils/process');
const isWin = require('./utils/is-win')();
const { reduce } = require('./utils/promises');

const fileExists = fileutils.fileExists;
const executableExists = fileutils.executableExists;


module.exports = class ProcessCtl extends EventEmitter {
  constructor(name, config, options) {
    super();

    options = options || {};

    this.name = name;
    this.config = config;
    this.killTimeout = options.killTimeout || 5000;
  }

  prepareOptions(options) {
    let defaults = {
      env: envWithLocalPath(this.config)
    };

    return _.assignIn({}, defaults, options);
  }

  _spawn(exe, args, options) {
    log.info('spawning: ' + exe + ' - ' + util.inspect(args));

    // promise should always succeed, Process will uses .on('error') to handle errors
    let process = execa(exe, args, Object.assign({ reject: false }, options));

    process.then(result => {
      if (result.failed && result.exitCode !== 0 &&
        result.shortMessage.includes(isWin ? 'is not recognized' : 'ENOENT'))
      {
        this.emit('processError', new Error(result.shortMessage), result.stdout, result.stderr);
      }
      return Promise.resolve(result);
    });

    let p  = new Process(this.name, { killTimeout: this.killTimeout }, process);
    this.emit('processStarted', p);
    return Promise.resolve(p);
  }

  spawn(exe, args, options) {
    let _options = this.prepareOptions(options);

    if (Array.isArray(exe)) {
      return reduce(exe, (found, exe) => {
        if (found) {
          return found;
        }

        return this.exeExists(exe, _options).then(exists => {
          if (exists) {
            return exe;
          }
        });
      }, false).then(found => {
        if (!found) {
          throw new Error('No executable found in: ' + util.inspect(exe));
        }

        return this._spawn(found, args, _options);
      });
    }

    return this._spawn(exe, args, _options);
  }

  exec(cmd, options) {
    log.info('executing: ' + cmd);
    let cmdParts = spawnargs(cmd);
    let exe = cmdParts[0];
    let args = cmdParts.slice(1);

    options = options || {};
    options.shell = true; // exec uses a shell by default

    return this.spawn(exe, args, options);
  }

  exeExists(exe, options) {
    return fileExists(exe).then(exists => {
      if (exists) {
        return exists;
      }

      return executableExists(exe, options);
    });
  }
};
