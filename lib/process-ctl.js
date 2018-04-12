'use strict';

var log = require('npmlog');
var execa = require('execa');
var Bluebird = require('bluebird');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var spawnargs = require('spawn-args');
var extend = require('lodash.assignin');

var envWithLocalPath = require('./env-with-local-path');
var fileutils = require('./fileutils');
var Process = require('./utils/process');

var fileExists = fileutils.fileExists;
var executableExists = fileutils.executableExists;

class ProcessCtl extends EventEmitter {
  constructor(name, config, options) {
    super();

    options = options || {};

    this.name = name;
    this.config = config;
    this.killTimeout = options.killTimeout || 5000;
  }

  prepareOptions(options) {
    var defaults = {
      env: envWithLocalPath(this.config)
    };

    return extend({}, defaults, options);
  }

  _spawn(exe, args, options) {
    log.info('spawning: ' + exe + ' - ' + util.inspect(args));
    var p  = new Process(this.name, { killTimeout: this.killTimeout }, execa(exe, args, options));
    this.emit('processStarted', p);
    return Bluebird.resolve(p);
  }

  spawn(exe, args, options) {
    var _options = this.prepareOptions(options);

    if (Array.isArray(exe)) {
      return Bluebird.reduce(exe, (found, exe) => {
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
    var cmdParts = spawnargs(cmd);
    var exe = cmdParts[0];
    var args = cmdParts.slice(1);

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
}

module.exports = ProcessCtl;
