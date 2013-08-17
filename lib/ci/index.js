var Server = require('../server')
var EventEmitter = require('events').EventEmitter
var async = require('async')
var BrowserTestRunner = require('./browser_test_runner')
var ProcessTestRunner = require('./process_test_runner')
var TapProcessTestRunner = require('./tap_process_test_runner')
var test_reporters = require('./test_reporters')
var Process = require('did_it_work')
var HookRunner = require('../hook_runner')
var log = require('winston')
var cleanExit = require('../clean_exit')

function App(config, finalizer){
  this.exited = false
  this.config = config
  this.server = new Server(this.config)
  this.cleanExit = finalizer || cleanExit
  var reporterName = this.config.get('reporter')
  var TestReporter = test_reporters[reporterName]
  if (!TestReporter){
    console.error('Test reporter `' + reporterName + '` not found.')
    this.cleanExit(1)
    return
  }
  this.reporter = new TestReporter
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
  runHook: function(/*hook, [data], callback*/){
    var hook = arguments[0]
    var callback = arguments[arguments.length-1]
    var data = arguments.length > 2 ? arguments[1] : {}
    var runner = this.hookRunners[hook] = new HookRunner(this.config, this.Process)
    runner.run(hook, data, callback)
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

  getExitCode: function(){
    if (this.reporter.total > this.reporter.pass)
      return 1
    if (this.reporter.total === 0 && this.config.get('fail_on_zero_tests'))
      return 1
    return 0
  },

  exit: function(){
    if (this.exited) return
    this.cleanExit(this.getExitCode())
    this.exited = true
  }
}





module.exports = App