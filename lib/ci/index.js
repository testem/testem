var Server = require('../server')
var EventEmitter = require('events').EventEmitter
var async = require('async')
var BrowserTestRunner = require('./browser_test_runner')
var ProcessTestRunner = require('./process_test_runner')
var TapProcessTestRunner = require('./tap_process_test_runner')
var TestReporter = require('./test_reporter')
var Process = require('did_it_work')
var template = require('../strutils').template

function App(config){
  this.config = config
  this.server = new Server(this.config)
  this.reporter = new TestReporter
  this.process = process
  this.Process = Process
}

App.prototype = {
  __proto__: EventEmitter.prototype,
  start: function(){
    async.series([
      this.startServer.bind(this),
      this.runHook.bind(this, 'on_start'),
      this.runHook.bind(this, 'before_tests'),
      this.createRunners.bind(this),
      this.registerSocketConnect.bind(this),
      this.runTheTests.bind(this),
      this.runHook.bind(this, 'after_tests'),
      this.runHook.bind(this, 'on_exit'),
      this.wrapUp.bind(this)
    ])
  },
  startServer: function(callback){
    this.server.start()
    this.server.once('server-start', function(){
      callback(null)
    }.bind(this))
  },
  runHook: function(hook, callback){
    var runner = new HookRunner(this)
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
    var reporter = this.reporter   
    async.eachLimit(this.runners, 100, function(runner, next){
      runner.start(next)
    }, callback)
  },
  wrapUp: function(){
    var process = this.process
    var reporter = this.reporter
    var server = this.server
    reporter.finish()
    server.stop(function(){
      process.exit()
    })
  }
}

function HookRunner(app){
  this.config = app.config
  this.Process = app.Process
}
HookRunner.prototype = {
  run: function(hook, callback){
    var hookCfg = this.config.get(hook)
    if (!hookCfg){
      return callback(null)
    }
    var cwd = this.config.get('cwd')
    var command
    var exe
    var args
    var waitForText
    if (typeof hookCfg === 'object'){
      command = hookCfg.command
      exe = hookCfg.exe
      args = hookCfg.args
      waitForText = hookCfg.wait_for_text
    }else if (typeof hookCfg === 'string'){
      command = hookCfg
    }
    var proc
    if (command){
      command = this.varsub(command)
      proc = this.Process(command)
    }else if (exe){
      proc = this.Process(exe, args || [])
    }else{
      throw new Error('No command or exe/args specified for hook ' + hook)
    }
    proc
      .options({cwd: cwd})
      .good(function(){
        callback(null)
      })
      .complete(function(err){
        callback(err)
      })
    if (waitForText){
      proc.goodIfMatches(this.varsub(waitForText))
    }
  },
  varsubParams: function(){
    return {
      host: this.config.get('host'),
      port: this.config.get('port'),
      url: this.config.get('url')
    }
  },
  varsub: function(str){
    return template(str, this.varsubParams())
  }
}



module.exports = App