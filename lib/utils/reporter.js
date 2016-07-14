'use strict';

var Bluebird = require('bluebird');

var reporters = require('../reporters');
var isa = require('../isa');
var ReportFile = require('./report-file');

function Reporter(app, stdout, path) {
  if (path) {
    this.reportFile = new ReportFile(path, stdout);
    this.reportFileStream = this.reportFile.outputStream;
  } else {
    this.reportFileStream = stdout;
  }

  var reporter = app.config.get('reporter');
  if (isa(reporter, String)) {
    var TestReporter = reporters[reporter];
    if (TestReporter) {
      this.reporter = new TestReporter(false, this.reportFileStream, app.config, app);
    }
  } else {
    this.reporter = reporter;
  }

  if (!this.reporter) {
    throw new Error('Test reporter `' + reporter + '` not found.');
  }

}

Reporter.with = function(app, stdout, path) {
  return Bluebird.try(function() {
    return new Reporter(app, stdout, path);
  }).disposer(function(reporter, promise) {
    if (promise.isRejected()) {
      var err = promise.reason();

      if (!err.hideFromReporter) {
        reporter.reporter.report(null, {
          passed: false,
          name: err.name || 'unknown error',
          error: {
            message: err.message
          }
        });
      }
    }

    return reporter.close();
  }.bind(this));
};

Reporter.prototype.close = function() {
  this.reporter.finish();

  if (this.reportFile) {
    return this.reportFile.close();
  }
};


module.exports = Reporter;
