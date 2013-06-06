var Server = require('../server')
var EventEmitter = require('events').EventEmitter
var async = require('async')
var BrowserTestRunner = require('./browser_test_runner')
var ProcessTestRunner = require('./process_test_runner')
var TapProcessTestRunner = require('./tap_process_test_runner')
var TestReporter = require('./test_reporter')

function App(config){
  this.config = config
  this.server = new Server(this.config)
  this.reporter = new TestReporter
  this.process = process
  this.child_process = require('child_process')
}

App.prototype = {
  __proto__: EventEmitter.prototype,
  start: function(){
    this.server.start()
    this.server.once('server-start', function(){
      this.runTheTests()
    }.bind(this))
  },
  runHook: function(hook, callback){
    var command = this.config.get(hook)
    if (!command){
      return callback(null)
    }
    var cwd = this.config.get('cwd')
    this.child_process.exec(command, {cwd: cwd}, callback)
  },
  runTheTests: function(){
    async.series([
      this.runHook.bind(this, 'on_start'),
      this.runHook.bind(this, 'before_tests'),
      this._runTheTests.bind(this),
      this.runHook.bind(this, 'after_tests'),
      this.runHook.bind(this, 'on_exit'),
      this.wrapUp.bind(this)
    ])
  },
  _runTheTests: function(callback){
    var self = this
    var reporter = this.reporter
    this.config.getLaunchers(function(launchers){
      async.eachLimit(launchers, 100, function(launcher, next){
        self.createTestRunner(launcher, reporter, next).start()
      }, callback)
    })  
  },
  wrapUp: function(){
    var process = this.process
    var reporter = this.reporter
    var server = this.server
    reporter.finish()
    server.stop(function(){
      process.exit()
    })
  },
  createTestRunner: function(launcher, reporter, next){
    if (launcher.protocol() === 'process'){
      return new ProcessTestRunner(launcher, reporter, next)
    }else if (launcher.protocol() === 'browser'){
      return new BrowserTestRunner(launcher, reporter, this.server, next)
    }else if (launcher.protocol() === 'tap'){
      return new TapProcessTestRunner(launcher, reporter, next)
    }
  }
}

module.exports = App