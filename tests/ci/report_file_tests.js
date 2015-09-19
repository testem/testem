var fs = require('fs')
var App = require('../../lib/ci')
var Config = require('../../lib/config')
var expect = require('chai').expect
var rimraf = require('rimraf')
var path = require('path')
var PassThrough = require('stream').PassThrough
var ReportFile = require('../../lib/ci/report_file')
var tmp = require('tmp')

describe('report file output', function() {
  this.timeout(30000)

  var mainReportDir, reportDir, filename;
  before(function(done) {
    tmp.dir(function(err, path) {
      if (err) {
        return done(err);
      }
      mainReportDir = path
      done()
    })
  })
  after(function(done) {
    rimraf(mainReportDir, function () {
      // TODO Handle unlink failures
      done()
    })
  })

  beforeEach(function(done) {
    tmp.dir({template: path.join(mainReportDir, '/reports-XXXXXX')}, function(err, dirPath){
      if (err) {
        return done(err);
      }
      reportDir = dirPath

      tmp.file({dir: dirPath, name: 'test-reports.xml'}, function(err, filePath) {
        if (err) {
          return done(err);
        }
        filename = filePath
        done()
      })
    })
  })

  it('allows passing in report_file from config', function(done){
    var fakeReporter = {}
    var config = new Config('ci', {
      reporter: fakeReporter,
      stdout_stream: new PassThrough(),
      report_file: filename
    })
    var app = new App(config, function () {
      expect(app.reportFileName).to.eq(filename)
      app.reportFile.fileStream.on('finish', done)
      app.reportFileStream.end()
    })
    app.exit();
  })

  it('doesn\'t create a file if the report_file parameter is not passed in', function(done){
    tmp.tmpName(function (err, filename) {
      if (err) {
        return done(err);
      }

      var fakeReporter = {}
      var config = new Config('ci', {
        reporter: fakeReporter,
        stdout_stream: new PassThrough(),
      })
      var app = new App(config, function () {
        fs.stat(filename, function(err) {
          expect(err).not.to.be.null()
          expect(err.code).to.eq('ENOENT')
          done()
        })
      });
      app.exit();
    })
  })

  it('writes out results to the normal output stream', function(done){
    var fakeStdout = new PassThrough()
    var reportFile = new ReportFile(filename, fakeStdout)
    reportFile.fileStream.on('finish', function() {
      var output = fakeStdout.read().toString()
      expect(output).to.match(/some test results/)
      done()
    })
    reportFile.stream.write('some test results')
    reportFile.stream.end()
  })

  it('writes out results to the file', function(done){
    var stream = new PassThrough()
    var reportFile = new ReportFile(filename, stream)
    var reportStream = reportFile.stream

    reportFile.fileStream.on('finish', function() {
      fs.readFile(filename, function(err, data) {
        if (err) {
          return done(err);
        }

        expect(data).to.match(/test data/)
        done()
      })
    })
    reportStream.write('test data')
    reportStream.end()
  })

  it('creates folders in the path if they don\'t exist', function(done) {
    var name = 'nested/test/folders/test-reports.xml'

    tmp.tmpName({dir: reportDir, name: name}, function (err, nestedFilename) {
      if (err) {
        return done(err);
      }

      var fakeStdout = new PassThrough()
      var reportFile = new ReportFile(nestedFilename, fakeStdout)
      reportFile.fileStream.on('finish', function() {
        fs.stat(nestedFilename, done)
      })
      reportFile.stream.end()
    })
  })
})
