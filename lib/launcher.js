var child_process = require('child_process')
var EventEmitter = require('events').EventEmitter
var log = require('winston')
var fs = require('fs')
var path = require('path')
var fileutils = require('./fileutils')
var async = require('async')
var ProcessRunner = require('./runners').ProcessRunner
var template = require('./strutils').template

function Launcher(name, settings, config){
  this.name = name
  this.config = config
  this.settings = settings
  this.setupDefaultSettings()
}

Launcher.prototype = {
  __proto__: EventEmitter.prototype
  , setupDefaultSettings: function(){
    var settings = this.settings
    if (settings.protocol === 'tap' && !('hide_stdout' in settings)){
      settings.hide_stdout = true
    }
  }
  , isProcess: function(){
    return this.settings.protocol !== 'browser'
  }
  , start: function(){
    if (this.isProcess()){
      var self = this
      self.runner = new ProcessRunner({
        launcher: self
      })
    }else{
      this.launch()
    }
  }
  , launch: function(cb){
    var self = this
    var url = this.config.get('url')
    var settings = this.settings
    this.kill('SIGTERM', function(){
      if (settings.setup){
        settings.setup(self.config, function(){
          self.doLaunch(cb)
        })
      }else{
        self.doLaunch(cb)
      }
    })

  }
  , doLaunch: function(cb){
    var config = this.config
    var url = config.get('url')
    var settings = this.settings
    var self = this
    var options = {}
    if (settings.cwd) options.cwd = settings.cwd
    if (settings.exe){

      function spawn(exe){
        args = self.template(args)
        self.process = child_process.spawn(exe, args, options)
        self.process.once('exit', self.onExit.bind(self))
        self.emit('processStarted', self.process)
        if (cb) cb(self.process)
      }

      var args = [url]
      if (settings.args instanceof Array)
        args = settings.args.concat(args)
      else if (settings.args instanceof Function){
        args = settings.args(config)
      }

      if (Array.isArray(settings.exe)){
        async.filter(settings.exe, self.exeExists, function(found){
          spawn(found[0])
        })
      }else{
        spawn(settings.exe)
      }

    }else if (settings.command){
      var cmd = this.template(settings.command)
      this.process = child_process.exec(cmd, options)
      this.process.on('exit', self.onExit.bind(self))
      self.emit('processStarted', self.process)
      if (cb) cb(self.process)
    }
  }
  , template: function(thing){
    if (Array.isArray(thing)){
      return thing.map(this.template, this)
    }else{
      var params = {
        url: this.config.get('url'),
        port: this.config.get('port')
      }
      return template(thing, params)
    }
  }
  , exeExists: function(exe, cb){
    fileutils.fileExists(exe, function(yes){
      if (yes) return cb(true)
      else fileutils.which(exe, function(yes){
        if (yes) return cb(true)
        else fileutils.where(exe, cb)
      })
    })
  }
  , onExit: function(code){
    this.exitCode = code
    this.emit('processExit', code)
    this.process = null
  }
  , kill: function(sig, cb){
    if (!this.process){
      if(cb) cb(this.exitCode)
      return
    }
    var process = this.process
    process.stdout.removeAllListeners()
    process.stderr.removeAllListeners()
    sig = sig || 'SIGTERM'

    process.once('exit', function(){
      process.removeAllListeners()
      if (cb) cb()
    })

    process.kill(sig)
  }
}

module.exports = Launcher
