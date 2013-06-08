var App = require('../../lib/ci')
var Config = require('../../lib/config')
var path = require('path')
var assert = require('chai').assert
var log = require('winston')
var sinon = require('sinon')

log.remove(log.transports.Console)

describe('ci mode app', function(){

  beforeEach(function(done){
    var fs = require('fs')
    fs.unlink('tests/fixtures/tape/public/bundle.js', function(){
      done()
    })
  })

  it('runs them tests', function(done){
    this.timeout(10000)
    var config = new Config('ci', {
      file: 'tests/fixtures/tape/testem.json',
      port: 7358,
      cwd: 'tests/fixtures/tape/',
      launch_in_ci: ['node', 'nodeplain', 'phantomjs']
    })
    config.read(function(){
      var app = new App(config)
      app.process = {exit: sinon.spy()}
      var reporter = app.reporter = new FakeReporter(function(){
        setTimeout(checkResults, 100)
      })
      app.start()

      function checkResults(){
        var helloWorld = reporter.results.filter(function(r){
          return r[1].name.match(/hello world/)
        })
        var helloBob = reporter.results.filter(function(r){
          return r[1].name.match(/hello bob/)
        })
        var nodePlain = reporter.results.filter(function(r){
          return r[0] === 'NodePlain'
        })
        assert(helloWorld.every(function(r){
          return r[1].passed
        }), 'hello world should pass')
        assert(helloBob.every(function(r){
          return !r[1].passed
        }), 'hello bob should fail')
        assert(!nodePlain[0][1].passed, 'node plain should fail')
        var browsers = reporter.results.map(function(r){
          return r[0]
        })
        assert.include(browsers, 'Node')
        assert.include(browsers, 'NodePlain')
        assert.include(browsers, 'PhantomJS 1.9')
        assert(reporter.results.length >= 1, 'should have a few launchers') // ball park?
        assert(app.process.exit.called, 'called process.exit()')
        done()
      }
    })
  })

})

function FakeReporter(done){
  this.done = done
  this.results = []
}
FakeReporter.prototype.report = function(){
  this.results.push(Array.prototype.slice.call(arguments))
}
FakeReporter.prototype.finish = function(){
  this.done()
}