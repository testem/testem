var fs = require('fs')
var App = require('../../lib/ci')
var Config = require('../../lib/config')
var assert = require('chai').assert
var expect = require('chai').expect
var rimraf = require('rimraf')
var path = require('path')
var PassThrough = require('stream').PassThrough
var ReportFile = require('../../lib/ci/report_file')
var tmp = require('tmp')

describe('report file output', function() {
  this.timeout(10000)

  var mainReportDir, reportDir, filename;
  before(function(done) {
    tmp.dir(function(err, path) {
      mainReportDir = path
      done()
    })
  })
  after(function(done) {
    rimraf(mainReportDir, function() {
      done()
    })
  })

  beforeEach(function(done) {
    tmp.dir({template: path.join(mainReportDir, '/reports-XXXXXX')}, function(err, dirPath){
      if(err) {
        throw err
      }
      reportDir = dirPath

      tmp.file({dir: dirPath, name: 'test-reports.xml'}, function(err, filePath) {
        filename = filePath
        done()
      })
    })
  })

  it('allows passing in report_file from config', function(){
    var fakeReporter = {}
    var config = new Config('ci', {
      reporter: fakeReporter,
      report_file: filename
    })
    var app = new App(config)
    assert.strictEqual(app.reportFileName, filename)
  })

  it('doesn\'t create a file if the report_file parameter is not passed in', function(done){
    tmp.tmpName(function (err, filename) {
      if (err) {
        throw err
      }

      var fakeReporter = {}
      var config = new Config('ci', {
        reporter: fakeReporter,
      })
      new App(config)
      fs.readFile(filename, function(error) {
        expect(error).not.to.be.null()
        done()
      })
    })
  })

  it('writes out results to the normal output stream', function(){
    var fakeStdout = new PassThrough()
    var reportFile = new ReportFile(filename, fakeStdout)
    reportFile.stream.write('some test results')
    var output = fakeStdout.read().toString()
    assert.match(output, /some test results/)
  })

  it('writes out results to the file', function(done){
    var stream = new PassThrough()
    var reportFile = new ReportFile(filename, stream)
    var reportStream = reportFile.stream

    reportStream.on('finish', function() {
      fs.readFile(filename, function(error, data) {
        assert.match(data, /test data/)
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
        throw err
      }

      var fakeStdout = new PassThrough()
      new ReportFile(nestedFilename, fakeStdout)

      fs.open(nestedFilename, 'r', function(error) {
        expect(error).to.be.null()
        done()
      })
    })
  })
})
