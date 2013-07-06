var App = require('../../lib/ci')
var TestReporter = require('../../lib/ci/test_reporter')
var Config = require('../../lib/config')
var bd = require('bodydouble')
var mock = bd.mock
var stub = bd.stub
var path = require('path')
var assert = require('chai').assert
var log = require('winston')
var Process = require('did_it_work')
var processUtils = require('../../lib/process_utils')

log.remove(log.transports.Console)

describe('ci mode app', function(){

  beforeEach(function(done){
    var fs = require('fs')
    fs.unlink('tests/fixtures/tape/public/bundle.js', function(){
      done()
    })
  })

  it('runs them tests on node, nodetap, and browser', function(done){
    this.timeout(10000)
    var config = new Config('ci', {
      file: 'tests/fixtures/tape/testem.json',
      port: 7358,
      cwd: 'tests/fixtures/tape/',
      launch_in_ci: ['node', 'nodeplain', 'phantomjs']
    })
    config.read(function(){
      var app = new App(config)
      stub(app, 'process', mock(process))
      stub(processUtils, 'exit')
      var reporter = stub(app, 'reporter', new TestReporter(true))
      app.once('tests-finish', function(){
        setTimeout(checkResults, 100)
      })
      app.start()

      function checkResults(){
        
        var helloWorld = reporter.results.filter(function(r){
          return r.result.name.match(/hello world/)
        })
        var helloBob = reporter.results.filter(function(r){
          return r.result.name.match(/hello bob/)
        })
        var nodePlain = reporter.results.filter(function(r){
          return r.launcher === 'NodePlain'
        })
        assert(helloWorld.every(function(r){
          return r.result.passed
        }), 'hello world should pass')
        
        assert(helloBob.every(function(r){
          return !r.result.passed
        }), 'hello bob should fail')
        
        assert(!nodePlain[0].result.passed, 'node plain should fail')
        
        var launchers = reporter.results.map(function(r){
          return r.launcher
        })
        
        assert.include(launchers, 'Node')
        assert.include(launchers, 'NodePlain')
        assert.include(launchers, 'PhantomJS 1.9')

        assert(reporter.results.length >= 1, 'should have a few launchers') // ball park?
        assert(processUtils.exit.called, 'called processUtils.exit()')
        assert.equal(processUtils.exit.lastCall.args[0], app.process)
        assert.equal(processUtils.exit.lastCall.args[1], 0)
        done()
      }
    })
  })

  it('fails and returns exit code of 1', function(done){
    this.timeout(20000);
    var config = new Config('ci', {
      cwd: 'tests/fixtures/fail/',
      port: 7359
    }, {
      launch_in_ci: ['phantomjs']
    })
    var app = new App(config)
    stub(app, 'process', mock(process))
    stub(processUtils, 'exit')
    var reporter = stub(app, 'reporter', new TestReporter(true))
      
    app.once('tests-finish', function(){
      setTimeout(function(){
        assert(processUtils.exit.called, 'should have exited')
        assert.equal(processUtils.exit.lastCall.args[0], app.process)
        assert.equal(processUtils.exit.lastCall.args[1], 1)
        done()
      }, 100)
    })
    app.start()
  })

  it('fails if before_tests fails', function(done){
    var config = new Config('ci', {
      file: 'tests/fixtures/hook_fail/testem.yml',
      cwd: 'tests/fixtures/hook_fail/',
      port: 7344
    }, {
      launch_in_ci: ['phantomjs']
    })
    config.read(function(){
      var app = new App(config)
      stub(app, 'process', mock(process))
      stub(processUtils, 'exit')
      var reporter = stub(app, 'reporter', new TestReporter(true))
      app.once('tests-finish', function(){
        setTimeout(function(){
          assert(processUtils.exit.called, 'should have exited')
          assert.equal(processUtils.exit.lastCall.args[0], app.process)
          assert.equal(processUtils.exit.lastCall.args[1], 1)
          done()
        }, 100)
      })
      app.start()
    })
  })

})

describe('runHook', function(){

  var fakeP

  beforeEach(function(){
    fakeP = mock(Process(''), {
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
    stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert(app.Process.called, 'how come you dont call me?')
      assert.equal(app.Process.lastCall.args, 'launch nuclear-missile')
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
    stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert.equal(app.Process.lastCall.args[0], 'launch nuclear-missile')
      assert.equal(fakeP.goodIfMatches.lastCall.args[0], 'launched.')
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
    stub(app, 'Process').returns(fakeP)
    app.runHook('on_start', function(){
      assert.equal(app.Process.lastCall.args[0], 
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
    stub(app, 'Process').returns(fakeP)
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

  it('kills on_start process on exit', function(done){
    this.timeout(10000)
    var config = new Config('ci', {
      file: 'tests/fixtures/tape/testem.json',
      port: 7358,
      cwd: 'tests/fixtures/tape/',
      launch_in_ci: ['node']
    })
    config.read(function(){
      config.set('on_start', 'launch missile')
      config.set('before_tests', null)
      var app = new App(config)
      stub(app, 'process', mock(process))
      stub(app, 'Process').returns(fakeP)
      var reporter = stub(app, 'reporter', new TestReporter(true))
      app.once('tests-finish', function(){
        setTimeout(checkResults, 100)
      })
      app.start()
      function checkResults(){
        assert.deepEqual(app.Process.lastCall.args[0], 'launch missile')
        assert(fakeP.kill.called, 'should have killed')
        done()
      }
    })
  })

})