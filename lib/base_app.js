var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var BrowserRunner = require('./browser_runner')
var HookRunner = require('./hook_runner')
var child_process = require('child_process')
var exec = child_process.exec
var log = require('winston')
var async = require('async')
var process = require('did_it_work')

function BaseApp(config){
  var self = this
  this.config = config
  this.runners = new Backbone.Collection

  this
    .on('all-test-results', function () {
      var allRunnersComplete = self.runners.all(function (runner) {
        var results = runner.get('results')
        return results && !!results.get('all')
      })
      if (allRunnersComplete) {
        self.emit('all-runners-complete')
      }
    })
}
BaseApp.prototype = {
  __proto__: EventEmitter.prototype
  , runPreprocessors: function(callback){
    this.runHook('before_tests', callback)
  }
  , runPostprocessors: function(callback){
    this.runHook('after_tests', callback)
  }
  , startOnStartHook: function(callback){
    this.onStartProcess = new HookRunner(this.config, process)
    this.onStartProcess.run('on_start', [], callback)
  }
  , runExitHook: function (callback) {
    if(this.onStartProcess) {
      this.onStartProcess.stop()
    }
    this.runHook('on_exit', callback)
  }
  , runHook: function(/*hook, data..., callback*/){
    var hook = arguments[0]
    var callback = arguments[arguments.length-1]
    var data = arguments.length > 2 ? arguments[1] : {}
    var runner = new HookRunner(this.config, process)
    var self = this
    log.info("Hook "+hook+" started")
    this.disableFileWatch = true
    runner.run(hook, data, function(err){
      log.info("Hook "+hook+" finished")
      self.disableFileWatch = false
      if (callback) { callback(err) }
    })
  }
  , removeBrowser: function(browser){
    this.runners.remove(browser)
  }
  , connectBrowser: function(browserName, id, client){
    var existing = this.runners.find(function(runner){
      return runner.pending && runner.get('name') === browserName
    })
    if (existing){
      clearTimeout(existing.pending)
      existing.set('socket', client)
      return existing
    }else{
      var browser = new BrowserRunner({
        name: browserName
        , socket: client
        , app: this
      })
      var self = this
      browser.on('disconnect', function(){
        browser.pending = setTimeout(function(){
            self.removeBrowser(browser)
        }, 1000)
      })
      browser.on('all-test-results', function(results, browser){
        self.emit('all-test-results', results, browser)
      })
      browser.on('top-level-error', function(msg, url, line){
        self.emit('top-level-error', msg, url, line)
      })
      this.runners.push(browser)
      return browser
    }
  }
  , cleanUpLaunchers: function(callback){
    if (!this.launchers){
      if (callback) callback()
      return
    }
    async.forEach(this.launchers, function(launcher, done){
      if (launcher && launcher.process){
        launcher.kill('SIGTERM', done)
      }else{
        done()
      }
    }, callback)
  }
}

module.exports = BaseApp
