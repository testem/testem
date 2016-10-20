'use strict';

var childProcess = require('child_process');
var log = require('npmlog');
var crossSpawn = require('cross-spawn');
var Bluebird = require('bluebird');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var spawnargs = require('spawn-args');
var extend = require('lodash.assignin');

var envWithLocalPath = require('./env-with-local-path');
var fileutils = require('./fileutils');

var fileExists = fileutils.fileExists;
var executableExists = fileutils.executableExists;

var isWin = require('./utils/is-win')();

function ProcessCtl(name, options) {
  options = options || {};

  this.name = name;
  this.killTimeout = options.killTimeout || 5000;
}

ProcessCtl.prototype.__proto__ = EventEmitter.prototype;

ProcessCtl.prototype.prepareOptions = function(options) {
  var defaults = {
    env: envWithLocalPath()
  };

  return extend({}, defaults, options);
};

ProcessCtl.prototype.onStdOut = function(pattern, fn, timeout) {
  var self = this;
  var timeoutID;

  var listener = function() {
    if (self.patternMatches(pattern)) {
      if (timeoutID) {
        clearTimeout(timeoutID);
      }
      return fn(null, self.stdout, self.stderr);
    }
  };

  this.on('out', listener);

  if (timeout) {
    timeoutID = setTimeout(function() {
      self.removeListener('out', listener);
      return fn(new Error('Timed out without seeing "' + pattern + '"'), self.stdout, self.stderr);
    }, timeout);
  }
};

ProcessCtl.prototype.patternMatches = function(pattern) {
  if (typeof pattern === 'string') {
    return this.stdout.indexOf(pattern) !== -1;
  } else { // regex
    return !!this.stdout.match(pattern);
  }
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
      self.emit('out');
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
  log.info('executing: ' + cmd);
  var cmdParts = spawnargs(cmd,  { removequotes: 'always' });
  var exe = cmdParts[0];
  var args = cmdParts.slice(1);

  options = options || {};
  options.shell = true; // exec uses a shell by default

  return this.spawn(exe, args, options);
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
    kill(self.process, sig);
  });
};

ProcessCtl.prototype.onKillTimeout = function() {
  log.warn('Process ' + this.name + ' not terminated in ' + this.killTimeout + 'ms.');
  kill(this.process, 'SIGKILL');
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

// Kill process and all child processes cross platform
function kill(p, sig) {
  if (isWin) {
    var command = 'taskkill.exe';
    var args = ['/t', '/pid', p.pid];
    if (sig === 'SIGKILL') {
      args.push('/f');
    }

    spawn(command, args).then(function(result) {
      // Processes without windows can't be killed without /F, detect and force
      // kill them directly
      if (result.stderr.indexOf('can only be terminated forcefully') !== -1) {
        kill(p, 'SIGKILL');
      }
    }).catch(function(err) {
      log.error(err);
    });
  } else {
    p.kill(sig);
  }
}

function spawn(command, args, options) {
  return new Bluebird.Promise(function(resolve, reject) {
    var p = childProcess.spawn(command, args, options);
    var stdout = '';
    var stderr = '';
    p.stdout.on('data', function(chunk) {
      stdout += chunk;
    });
    p.stderr.on('data', function(chunk) {
      stderr += chunk;
    });
    p.on('error', reject);
    p.on('close', function(code) {
      resolve({ code: code, stdout: stdout, stderr: stderr });
    });
  });

}

module.exports = ProcessCtl;
