var Server = require('./server')
var EventEmitter = require('events').EventEmitter
var async = require('async')

function App(config){
  this.config = config
  this.start()
}

App.prototype = {
  __proto__: EventEmitter.prototype,
  start: function(){
    this.setupServer()
  },
  setupServer: function(){
    this.server = new Server(this.config)
    this.server.start()
    this.server.once('server-start', function(){
      this.runTheTests()
    }.bind(this))
  },
  runTheTests: function(){
    var self = this
    var server = this.server
    this.config.getLaunchers(function(launchers){
      async.forEachSeries(launchers, function(launcher, next){
        self.createTestRunner(launcher, next).start()
      }, function(){
        process.exit()
      })
    })
  },
  createTestRunner: function(launcher, next){
    if (launcher.protocol() === 'process'){
      return new ProcessTestRunner(launcher, next)
    }else if (launcher.protocol() === 'browser'){
      return new BrowserTestRunner(launcher, this.server, next)
    }else if (launcher.protocol() === 'tap'){
      return new TapProcessTestRunner(launcher, next)
    }
  }
}

function BrowserTestRunner(launcher, server, onFinish){
  this.launcher = launcher
  this.server = server
  this.onFinish = onFinish
}
BrowserTestRunner.prototype = {
  start: function(){
    var launcher = this.launcher
    launcher.start()
    this.server.once('browser-login', this.onBrowserLogin.bind(this))
  },
  onBrowserLogin: function(browser, socket){
    socket.on('test-result', this.onTestResult.bind(this))
    socket.once('all-test-results', this.onAllTestResults.bind(this))
  },
  onTestResult: function(result){
    console.log((result.passed ? 'ok ' : 'not ok ') +
      result.id + ' ' + result.name)
  },
  onAllTestResults: function(results){
    var onFinish = this.onFinish
    //console.log('Got all test results', results)
    this.launcher.kill(null, function(){
      onFinish()
    })
  }
}

function ProcessTestRunner(launcher, onFinish){
  this.launcher = launcher
  this.onFinish = onFinish
}
ProcessTestRunner.prototype = {
  start: function(){
    this.launcher.start()
    this.launcher.once('processExit', this.onProcessExit.bind(this))
  },
  onProcessExit: function(code){
    if (code === 0){
      console.log('Test passed')
    }else{
      console.log('Test failed')
    }
    this.onFinish()
  }
}

var tap = require('tap')
function TapProcessTestRunner(launcher, onFinish){
  this.launcher = launcher
  this.onFinish = onFinish
  this.tapConsumer = new tap.Consumer()
  this.reporter = new TestReporter()
}
TapProcessTestRunner.prototype = {
  start: function(){
    this.launcher.start()
    this.launcher.process.stdout.pipe(this.tapConsumer)
    this.tapConsumer.on('data', this.onData.bind(this))
    this.tapConsumer.on('end', this.onEnd.bind(this))
    this.tapConsumer.on('bailout', this.onBailout.bind(this))
  },
  onData: function(data){
    if (typeof data === 'object'){
      this.reporter.report(data)
    }
  },
  onEnd: function(err, count){
    this.wrapUp()
  },
  onBailout: function(){
    this.wrapUp()
  },
  wrapUp: function(){
    this.reporter.finish()
    this.onFinish()
  }
}

function TestReporter(){
  this.total = 0
  this.pass = 0
}
TestReporter.prototype = {
  report: function(data){
    console.log((data.ok ? 'ok ' : 'not ok ') + data.id + ' ' + data.name)
      this.total++
      if (data.ok) this.pass++
  },
  finish: function(){
    console.log()
    console.log('1..' + this.total)
    console.log('# tests ' + this.total)
    console.log('# pass  ' + this.pass)
    console.log('# fail  ' + (this.total - this.pass))
  }
}

module.exports = App