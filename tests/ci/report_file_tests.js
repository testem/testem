

const fs = require('fs');
const App = require('../../lib/app');
const Config = require('../../lib/config');
const expect = require('chai').expect;
const rimraf = require('rimraf').rimraf;
const os = require('os');
const path = require('path');
const { randomBytes } = require('crypto');
const PassThrough = require('stream').PassThrough;
const ReportFile = require('../../lib/utils/report-file');

const FakeReporter = require('../support/fake_reporter');

const rimrafAsync = rimraf;

describe('report file output', function() {
  this.timeout(30000);

  let reportDir, filename;
  beforeEach(function() {
    reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-'));
    filename = path.join(reportDir, 'test-reports.xml');
    fs.writeFileSync(filename, '');
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
    const unusedFilename = path.join(reportDir, randomBytes(8).toString('hex'));
    {
      let config = new Config('ci', {
        reporter: new FakeReporter(),
        stdout_stream: new PassThrough()
      });
      let app = new App(config, () => {
        fs.stat(unusedFilename, err => {
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
    }
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

  it('creates folders in the path if they don\'t exist', function() {
    let name = 'nested/test/folders/test-reports.xml';
    let nestedFilename = path.join(reportDir, name);
    let nestedDir = path.dirname(nestedFilename);

    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(nestedFilename, '');

    return new Promise(resolve => {
      let reportFile = new ReportFile(nestedFilename);
      reportFile.outputStream.on('finish', () => {
        fs.stat(nestedFilename, resolve);
      });
      reportFile.outputStream.end();
    });
  });
});
