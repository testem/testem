'use strict';

var Bluebird = require('bluebird');

var fsPath = require('path');
var reporters = require('../reporters');
var isa = require('../isa');
var ReportFile = require('./report-file');

function Reporter(app, stdout, path) {
  this.total = 0;
  this.passed = 0;
  this.skipped = 0;

  if (path) {
    this.reportFile = new ReportFile(path);
  }

  var config = app.config;

  function requireNamedReporter(reporterName) {
    var pluginDirectory = fsPath.join(config.get('config_dir'), 'node_modules');
    var pluginPackage = fsPath.join(pluginDirectory, reporterName);
    return require(pluginPackage);
  }

  function setupReporter(name, writer) {
    var reporter;

    if (!writer || !writer.write) {
      writer = stdout;
    }

    if (isa(name, String)) {
      var TestReporter = reporters[name] || requireNamedReporter(name);

      if (TestReporter) {
        reporter = new TestReporter(false, writer, config, app);
      }
    } else {
      reporter = name;
    }

    if (!reporter) {
      throw new Error('Test reporter `' + name + '` not found.');
    }

    return reporter;
  }


  if (path && config.get('xunit_intermediate_output') && config.get('reporter') === 'xunit') {
    this.reporters = [
      setupReporter('tap', stdout, config, app),
      setupReporter(config.get('reporter'), this.reportFile.outputStream)
    ];
  } else {
    var userReporters = config.get('reporters') || [config.get('reporter')];
    this.reporters = userReporters.map(setupReporter);

    if (path) {
      this.reporters.push(setupReporter(config.get('reporter'), this.reportFile.outputStream));
    }
  }
}

Reporter.with = function(app, stdout, path) {
  return Bluebird.try(function() {
    return new Reporter(app, stdout, path);
  }).disposer(function(reporter, promise) {
    if (promise.isRejected()) {
      var err = promise.reason();

      if (!err.hideFromReporter) {
        reporter.report(null, {
          passed: false,
          name: err.name || 'unknown error',
          error: {
            message: err.message
          }
        });
      }
    }

    return reporter.close();
  });
};

Reporter.prototype.close = function() {
  this.finish();

  if (this.reportFile) {
    return this.reportFile.close();
  }
};

Reporter.prototype.hasTests = function() {
  return this.total > 0;
};

Reporter.prototype.hasPassed = function() {
  return this.total <= ((this.passed || 0) + (this.skipped || 0));
};

function forwardToReporters(fn) {
  return function() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    }

    this.reporters.forEach(function(reporter) {
      if (reporter[fn]) {
        reporter[fn].apply(reporter, args);
      }
    });
  };
}

Reporter.prototype.report = function(name, result) {
  this.total++;
  if (result.skipped) {
    this.skipped++;
  } else if (result.passed) {
    this.passed++;
  }

  this.reporters.forEach(function(reporter) {
    reporter.report(name, result);
  });
};

['finish', 'onStart', 'onEnd', 'reportMetadata'].forEach(function(fn) {
  Reporter.prototype[fn] = forwardToReporters(fn);
});

module.exports = Reporter;
