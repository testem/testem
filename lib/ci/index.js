var Server = require('../server')
var EventEmitter = require('events').EventEmitter
var async = require('async')
var BrowserTestRunner = require('./browser_test_runner')
var ProcessTestRunner = require('./process_test_runner')
var TapProcessTestRunner = require('./tap_process_test_runner')
var TestReporter = require('./test_reporter')
var Process = require('did_it_work')
var HookRunner = require('./hook_runner')
var log = require('winston')

function App(config){
  this.config = config
  this.server = new Server(this.config)
  this.reporter = new TestReporter
  this.process = process
  this.Process = Process
  this.hookRunners = {}
  this.results = []
}

App.prototype = {
  __proto__: EventEmitter.prototype,
  start: function(){
    log.info('Starting ci')
    async.series([
      this.startServer.bind(this),
      this.runHook.bind(this, 'on_start'),
      this.runHook.bind(this, 'before_tests'),
      this.createRunners.bind(this),
      this.registerSocketConnect.bind(this),
      this.runTheTests.bind(this),
      this.runHook.bind(this, 'after_tests'),
      this.runHook.bind(this, 'on_exit')
    ], function(err){
      this.wrapUp(err)
    }.bind(this))
  },
  startServer: function(callback){
    log.info('Starting server')
    this.server.start()
    this.server.once('server-start', function(){
      callback(null)
    }.bind(this))
  },
  runHook: function(hook, callback){
    var runner = this.hookRunners[hook] = new HookRunner(this.config, this.Process)
    runner.run(hook, callback)
  },
  registerSocketConnect: function(callback){
    this.server.on('browser-login', this.onBrowserLogin.bind(this))
    callback(null)
  },
  onBrowserLogin: function(browser, id, socket){
    this.runners.forEach(function(runner){
      if (runner.tryAttach){
        runner.tryAttach(browser, id, socket)
      }
    })
  },
  createRunners: function(callback){
    var reporter = this.reporter
    var self = this
    this.config.getLaunchers(function(launchers){
      self.runners = launchers.map(function(launcher){
        return self.createTestRunner(launcher, reporter)
      })
      callback(null)
    })
  },
  getRunnerFactory: function(launcher){
    var protocol = launcher.protocol()
    switch(protocol){
      case 'process':
        return ProcessTestRunner
      case 'browser':
        return BrowserTestRunner
      case 'tap':
        return TapProcessTestRunner
      default:
        throw new Error("Don't know about " + protocol + " protocol.")
    }
  },
  createTestRunner: function(launcher, reporter){
    return new (this.getRunnerFactory(launcher))(launcher, reporter)
  },
  runTheTests: function(callback){
    var self = this
    var limit = this.config.get('parallel')
    async.eachLimit(this.runners, limit, function(runner, next){
      runner.start(next)
    }, callback)
  },
  wrapUp: function(err){
    if (err){
      this.reporter.report(null, {
        passed: false,
        name: err.name || 'unknown error',
        error: {
          message: err.message
        }
      })
    }
    this.reporter.finish()
    this.emit('tests-finish')
    this.stopHookRunners()
    try{
      this.server.stop(this.exit.bind(this))
    }catch(e){
      // ignore if server was already closed and throws
    }
    setTimeout(this.exit.bind(this), 500)
  },
  
  stopHookRunners: function(){
    for (var runner in this.hookRunners){
      this.hookRunners[runner].stop()
    }
  },
  exit: function(){
    var failed = this.reporter.total > this.reporter.pass
    this.process.exit(failed ? 1 : 0)
  }
}





module.exports = App