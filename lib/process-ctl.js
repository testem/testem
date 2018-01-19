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

function ProcessCtl(name, config, options) {
  options = options || {};

  this.name = name;
  this.config = config;
  this.killTimeout = options.killTimeout || 5000;
}

ProcessCtl.prototype.__proto__ = EventEmitter.prototype;

ProcessCtl.prototype.prepareOptions = function(options) {
  var defaults = {
    env: envWithLocalPath(this.config)
  };

  return extend({}, defaults, options);
};

ProcessCtl.prototype._spawn = function(exe, args, options) {
  log.info('spawning: ' + exe + ' - ' + util.inspect(args));
  var p  = new Process(this.name, { killTimeout: this.killTimeout }, execa(exe, args, options));
  this.emit('processStarted', p);
  return Bluebird.resolve(p);
};

ProcessCtl.prototype.spawn = function(exe, args, options) {
  var _options = this.prepareOptions(options);
  var self = this;

  if (Array.isArray(exe)) {
    return Bluebird.reduce(exe, function(found, exe) {
      if (found) {
        return found;
      }

      return self.exeExists(exe, _options).then(function(exists) {
        if (exists) {
          return exe;
        }
      });
    }, false).then(function(found) {
      if (!found) {
        throw new Error('No executable found in: ' + util.inspect(exe));
      }

      return self._spawn.call(self, found, args, _options);
    });
  }

  return this._spawn.call(this, exe, args, _options);
};

ProcessCtl.prototype.exec = function(cmd, options) {
  log.info('executing: ' + cmd);
  var cmdParts = spawnargs(cmd);
  var exe = cmdParts[0];
  var args = cmdParts.slice(1);

  options = options || {};
  options.shell = true; // exec uses a shell by default

  return this.spawn(exe, args, options);
};

ProcessCtl.prototype.exeExists = function(exe, options) {
  return fileExists(exe).then(function(exists) {
    if (exists) {
      return exists;
    }

    return executableExists(exe, options);
  });
};

module.exports = ProcessCtl;
