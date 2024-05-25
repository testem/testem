'use strict';

const fs = require('fs');
const App = require('../../lib/app');
const Config = require('../../lib/config');
const Bluebird = require('bluebird');
const expect = require('chai').expect;
const rimraf = require('rimraf');
const path = require('path');
const PassThrough = require('stream').PassThrough;
const ReportFile = require('../../lib/utils/report-file');
const tmp = require('tmp');

const FakeReporter = require('../support/fake_reporter');

const tmpDirAsync = Bluebird.promisify(tmp.dir);
const tmpFileAsync = Bluebird.promisify(tmp.file);
const rimrafAsync = Bluebird.promisify(rimraf);

describe('report file output', function() {
  this.timeout(30000);

  let reportDir, filename;
  beforeEach(function() {
    return tmpDirAsync({
      keep: true
    }).then(dir => {
      reportDir = dir;

      return tmpFileAsync({
        dir: dir,
        name: 'test-reports.xml',
        keep: true,
        discardDescriptor: true
      });
    }).then(filePath => {
      filename = filePath;
    });
  });

  afterEach(function() {
    return rimrafAsync(reportDir);
  });

  it('allows passing in report_file from config', function(done) {
    let dir = path.join('tests/fixtures/success-skipped');

    let config = new Config('ci', {
      file: path.join(dir, 'testem.json'),
      port: 0,
      cwd: dir,
      reporter: new FakeReporter(),
      stdout_stream: new PassThrough(),
      report_file: filename,
      launch_in_ci: ['Headless Firefox']
    });

    let app = new App(config, () => {
      expect(app.reportFileName).to.eq(filename);

      // fileStream already closed
      done();
    });
    app.start();
  });

  it('doesn\'t create a file if the report_file parameter is not passed in', function(done) {
    tmp.tmpName((err, filename) => {
      if (err) {
        return done(err);
      }

      let config = new Config('ci', {
        reporter: new FakeReporter(),
        stdout_stream: new PassThrough()
      });
      let app = new App(config, () => {
        fs.stat(filename, err => {
          try {
            expect(err).not.eql(null);
            expect(err.code).to.eq('ENOENT');
          } catch (e) {
            done(e);
          } finally {
            done();
          }
        });
      });
      app.start();
      app.exit();
    });
  });

  it('writes out results to the file', function(done) {
    let reportFile = new ReportFile(filename);
    let reportStream = reportFile.outputStream;

    reportFile.outputStream.on('finish', function() {
      fs.readFile(filename, (err, data) => {
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
    let name = 'nested/test/folders/test-reports.xml';

    tmp.tmpName({
      dir: reportDir,
      name: name
    }, (err, nestedFilename) => {

      if (err) {
        return done(err);
      }

      let reportFile = new ReportFile(nestedFilename);
      reportFile.outputStream.on('finish', () => {
        fs.stat(nestedFilename, done);
      });
      reportFile.outputStream.end();
    });
  });
});
