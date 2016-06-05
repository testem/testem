'use strict';

var childProcess = require('child_process');
var log = require('npmlog');
var crossSpawn = require('cross-spawn');
var Bluebird = require('bluebird');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var envWithLocalPath = require('./env-with-local-path');
var fileutils = require('./fileutils');

var fileExists = fileutils.fileExists;
var executableExists = fileutils.executableExists;

var isWin = /^win/.test(process.platform);

function ProcessCtl(name, options) {
  options = options || {};

  this.name = name;
  this.killTimeout = options.killTimeout || 5000;
}

ProcessCtl.prototype.__proto__ = EventEmitter.prototype;

ProcessCtl.prototype.prepareOptions = function(options) {
  options = options || {};

  var _options = {
    env: envWithLocalPath()
  };

  if (options.cwd) {
    _options.cwd = options.cwd;
  }

  return _options;
};

ProcessCtl.prototype.spawn = function(exe, args, options) {
  var _options = this.prepareOptions(options);

  var self = this;
  var spawn = function spawn(exe) {
    log.info('spawning: ' + exe + ' - ' + util.inspect(args));
    this.process = crossSpawn(exe, args, _options);
    this.stdout = '';
    this.stderr = '';
    this.process.stdout.on('data', function(chunk) {
      self.stdout += chunk;
    });
    this.process.stderr.on('data', function(chunk) {
      self.stderr += chunk;
    });

    return this.onStart();
  };

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

      return spawn.call(self, found);
    });
  }

  return spawn.call(this, exe);
};

ProcessCtl.prototype.exec = function(cmd, options) {
  var _options = this.prepareOptions(options);

  log.info('executing: ' + cmd);

  var self = this;
  this.process = childProcess.exec(cmd, _options, function(err, stdout, stderr) {
    self.stdout = stdout;
    self.stderr = stderr;
  });

  return this.onStart();
};

ProcessCtl.prototype.onStart = function() {
  this.process.on('close', this.onClose.bind(this));
  this.process.on('error', this.onError.bind(this));
  this.emit('processStarted', this.process);

  return Bluebird.resolve(this.process);
};

ProcessCtl.prototype.exeExists = function(exe, options) {
  return fileExists(exe).then(function(exists) {
    if (exists) {
      return exists;
    }

    return executableExists(exe, options);
  });
};

ProcessCtl.prototype.kill = function(sig) {
  if (!this.process) {
    log.info('Process ' + this.name + ' already killed.');

    return Bluebird.resolve(this.exitCode);
  }

  sig = sig || 'SIGTERM';

  var self = this;

  return new Bluebird.Promise(function(resolve) {
    // TODO Fix those likely not removed
    self.process.removeListener('close', self.onClose.bind(self));
    self.process.removeListener('error', self.onError.bind(self));

    self.process.once('close', function(code, sig) {
      self.process = null;
      if (self._killTimer) {
        clearTimeout(self._killTimer);
        self._killTimer = null;
      }
      log.info('Process ' + self.name + ' terminated.', code, sig);

      resolve(code);
    });
    self.process.on('error', function(err) {
      log.error('Error killing process ' + self.name + '.', err);
    });
    self._killTimer = setTimeout(self.onKillTimeout.bind(self), self.killTimeout);
    if (isWin) {
      childProcess.exec('taskkill /pid ' + self.process.pid + ' /T');
    } else {
      self.process.kill(sig);
    }
  });
};

ProcessCtl.prototype.onKillTimeout = function() {
  log.warn('Process ' + this.name + ' not terminated in ' + this.killTimeout + 'ms.');
  if (isWin) {
    childProcess.exec('taskkill /pid ' + this.process.pid + ' /T /F');
  } else {
    this.process.kill('SIGKILL');
  }
};

ProcessCtl.prototype.onClose = function(code) {
  if (!this.process) {
    return;
  }
  log.warn(this.name + ' closed', code);
  this.process = null;
  this.exitCode = code;
  this.emit('processExit', code, this.stdout, this.stderr);
};

ProcessCtl.prototype.onError = function(error) {
  log.warn(this.name + ' errored', error);
  this.process = null;
  this.exitCode = 1;
  this.emit('processError', 1, error, this.stdout, this.stderr);
};

module.exports = ProcessCtl;
