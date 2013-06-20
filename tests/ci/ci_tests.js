var App = require('../../lib/ci')
var Config = require('../../lib/config')
var BodyDouble = require('../support/body_double')
var path = require('path')
var assert = require('chai').assert
var log = require('winston')
var sinon = require('sinon')
var Process = require('did_it_work')

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



describe('runHook', function(){

  var fakeP

  beforeEach(function(){
    fakeP = BodyDouble(Process(''), {
      fluent: true,
      override: {
        complete: function(callback){
          process.nextTick(function(){
            callback(null)
          })
          return this
        }
      }
    })
  })

  it('runs hook', function(done){
    var config = new Config('ci', null, {
      on_start: 'launch nuclear-missile'
    })
    var app = new App(config)
    sinon.stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert(app.Process.called, 'how come you dont call me?')
      assert.equal(app.Process.getCall(0).args, 'launch nuclear-missile')
      done()
    })
  })

  it('waits for text', function(done){
    var config = new Config('ci', null, {
      on_start: {
        command: 'launch nuclear-missile',
        wait_for_text: 'launched.'
      }
    })
    var app = new App(config)
    sinon.stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert.equal(app.Process.getCall(0).args[0], 'launch nuclear-missile')
      assert.equal(fakeP.goodIfMatches.getCall(0).args[0], 'launched.')
      done()
    })
  })

  it('substitutes port and host', function(done){
    var config = new Config('ci', {
      port: 2837,
      host: 'dev.app.com'
    }, {
      on_start: {
        command: 'tunnel <host>:<port> -u <url>'
      }
    })
    var app = new App(config)
    sinon.stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert.equal(app.Process.getCall(0).args[0], 
        'tunnel dev.app.com:2837 -u http://dev.app.com:2837/')
      done()
    })
  })

  it('launches via spawn', function(done){
    var config = new Config('ci', null, {
      on_start: {
        exe: 'launch',
        args: ['nuclear-missile', '<port>']
      }
    })
    var app = new App(config)
    sinon.stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert(app.Process.called, 'call Process')
      assert.deepEqual(app.Process.lastCall.args, ['launch', ['nuclear-missile', '7357']])
      done()
    })
  })

  it('dies if neither command or exe specified', function(){
    var config = new Config('ci', null, {
      on_start: {
      }
    })
    var app = new App(config)
    assert.throw(function(){
      app.runHook('on_start', function(){})
    }, 'No command or exe/args specified for hook on_start')
  })

})