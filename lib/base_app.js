var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var BrowserRunner = require('./browser_runner')
var child_process = require('child_process')
var exec = child_process.exec
var log = require('winston')
var template = require('./strutils').template
var async = require('async')
var process = require('did_it_work')

function BaseApp(config){
  var self = this
  this.config = config
  this.port = this.config.get('port')
  this.host = this.config.get('host')
  this.url = 'http://' + this.host + ':' + this.port
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
  , template: function(thing) {
    var params = {
      host: this.config.get('host'),
      port: this.config.get('port')
    }
    if (Array.isArray(thing)){
      return thing.map(this.template, this)
    }else{
      return template(thing, params)
    }
  }
  , startOnStartHook: function(callback){
    var on_start = this.config.get('on_start')
    if (!on_start) return callback()    
    var proc = this.onStartProcess = this.createOnStartProcess()
    var waitForText = on_start.wait_for_text
    if (waitForText){
      proc.goodIfMatches(waitForText, on_start.wait_for_text_timeout || 4000)
    }
    proc.good(function(){
      callback(proc)
    })
  }
  , createOnStartProcess: function(){
    var on_start = this.config.get('on_start')
    if (on_start.exe){ // use spawn
      var args = on_start.args || []
      proc = process(this.template(on_start.exe), this.template(args))
      log.info('Starting on_start hook: ' + on_start.exe + ' ' +
        args.join(' '))
    }else{ // use exec
      var cmd = on_start.command ? on_start.command : on_start
      cmd = this.template(cmd)
      proc = process(cmd)
      log.info('Starting on_start hook: ' + cmd)
    }
    return proc
  }
  , runExitHook: function (callback) {
    if(this.onStartProcess) {
      this.onStartProcess.kill('SIGTERM');
    }
    this.runHook('on_exit', callback)
  }
  , runHook: function(hook, callback){
    var self = this
    var hookCommand = this.config.get(hook)
    if (hookCommand){
      hookCommand = this.template(hookCommand)
      log.info('Running ' + hook + ' command ' + hookCommand)
      this.disableFileWatch = true
      exec(hookCommand, function(err, stdout, stderr){
        self.disableFileWatch = false
        if (callback) callback(err, stdout, stderr, hookCommand)
      })
    }else{
      if (callback) callback()
    }
  }
  , removeBrowser: function(browser){
    this.runners.remove(browser)
  }
  , connectBrowser: function(browserName, client){
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
