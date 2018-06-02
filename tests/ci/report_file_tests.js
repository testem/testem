'use strict';

var fs = require('fs');
var App = require('../../lib/app');
var Config = require('../../lib/config');
var Bluebird = require('bluebird');
var expect = require('chai').expect;
var rimraf = require('rimraf');
var path = require('path');
var PassThrough = require('stream').PassThrough;
var ReportFile = require('../../lib/utils/report-file');
var tmp = require('tmp');

var FakeReporter = require('../support/fake_reporter');

var tmpDirAsync = Bluebird.promisify(tmp.dir);
var tmpFileAsync = Bluebird.promisify(tmp.file);
var rimrafAsync = Bluebird.promisify(rimraf);

describe('report file output', function() {
  this.timeout(30000);

  var reportDir, filename;
  beforeEach(function() {
    return tmpDirAsync({
      keep: true
    }).then(function(dir) {
      reportDir = dir;

      return tmpFileAsync({
        dir: dir,
        name: 'test-reports.xml',
        keep: true,
        discardDescriptor: true
      });
    }).then(function(filePath) {
      filename = filePath;
    });
  });

  afterEach(function() {
    return rimrafAsync(reportDir);
  });

  it('allows passing in report_file from config', function(done) {
    var dir = path.join('tests/fixtures/success-skipped');

    var config = new Config('ci', {
      file: path.join(dir, 'testem.json'),
      port: 0,
      host: 'localhost',
      cwd: dir,
      reporter: new FakeReporter(),
      stdout_stream: new PassThrough(),
      report_file: filename,
      launch_in_ci: ['phantomjs']
    });

    var app = new App(config, function() {
      expect(app.reportFileName).to.eq(filename);

      // fileStream already closed
      done();
    });
    app.start();
  });

  it('doesn\'t create a file if the report_file parameter is not passed in', function(done) {
    tmp.tmpName(function(err, filename) {
      if (err) {
        return done(err);
      }

      var config = new Config('ci', {
        reporter: new FakeReporter(),
        stdout_stream: new PassThrough()
      });
      var app = new App(config, function() {
        fs.stat(filename, function(err) {
          expect(err).not.to.be.null();
          expect(err.code).to.eq('ENOENT');
          done();
        });
      });
      app.start();
      app.exit();
    });
  });

  it('writes out results to the file', function(done) {
    var reportFile = new ReportFile(filename);
    var reportStream = reportFile.outputStream;

    reportFile.outputStream.on('finish', function() {
      fs.readFile(filename, function(err, data) {
        if (err) {
          return done(err);
        }

        expect(data).to.match(/test data/);
        done();
      });
    });
    reportStream.write('test data');
    reportStream.end();
  });

  it('creates folders in the path if they don\'t exist', function(done) {
    var name = 'nested/test/folders/test-reports.xml';

    tmp.tmpName({dir: reportDir, name: name}, function(err, nestedFilename) {
      if (err) {
        return done(err);
      }

      var reportFile = new ReportFile(nestedFilename);
      reportFile.outputStream.on('finish', function() {
        fs.stat(nestedFilename, done);
      });
      reportFile.outputStream.end();
    });
  });
});
