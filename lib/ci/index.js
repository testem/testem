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
}

App.prototype = {
  __proto__: EventEmitter.prototype,
  start: function(){
    this.server.start()
    this.server.once('server-start', function(){
      this.runTheTests()
    }.bind(this))
  },
  runTheTests: function(){
    var self = this
    var server = this.server
    var reporter = this.reporter
    var process = this.process
    this.config.getLaunchers(function(launchers){
      async.eachLimit(launchers, 100, function(launcher, next){
        self.createTestRunner(launcher, reporter, next).start()
      }, function(){
        reporter.finish()
        process.exit()
      })
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