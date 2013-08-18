var child_process = require('child_process')
var EventEmitter = require('events').EventEmitter
var log = require('winston')
var fileutils = require('./fileutils')
var async = require('async')
var ProcessRunner = require('./process_runner')
var template = require('./strutils').template

function Launcher(name, settings, config){
  this.name = name
  this.config = config
  this.settings = settings
  this.setupDefaultSettings()
  this.id = String(Math.floor(Math.random() * 10000))
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
  , protocol: function(){
    return this.settings.protocol || 'process'
  }
  , commandLine: function(){
    return '"' + this.settings.command + '"'
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
  , getUrl: function(){
    return this.config.get('url') + this.id
  }
  , launch: function(cb){
    var self = this
    var settings = this.settings
    this.kill('SIGTERM', function(){
      if (settings.setup){
        settings.setup.call(self, self.config, function(){
          self.doLaunch(cb)
        })
      }else{
        self.doLaunch(cb)
      }
    })

  }
  , doLaunch: function(cb){
    var id = this.id
    var config = this.config
    var url = config.get('url') + id
    var settings = this.settings
    var self = this
    var options = {}
    if (settings.cwd) options.cwd = settings.cwd
    if (settings.exe){

      function spawn(exe){
        args = self.template(args, id)
        log.info('spawning: ' + exe + ' - ' + JSON.stringify(args))
        self.process = child_process.spawn(exe, args, options)
        self.stdout = ''
        self.stderr = ''
        self.process.stdout.on('data', function(chunk){
          self.stdout += chunk
        })
        self.process.stderr.on('data', function(chunk){
          self.stderr += chunk
        })
        self.process.once('close', self.onClose.bind(self))
        self.process.once('exit', function(code, signal) {
          if (code) {
            log.info("process " + exe + " quit with code " + code)
          };
          if (signal) {
            log.info("process " + exe + " quit with signal " + signal);
          }
        });
        self.emit('processStarted', self.process)
        if (cb) cb(self.process)
      }

      var args = [url]
      if (settings.args instanceof Array)
        args = settings.args.concat(args)
      else if (settings.args instanceof Function){
        args = settings.args.call(self, config)
      }

      if (Array.isArray(settings.exe)){
        async.filter(settings.exe, self.exeExists, function(found){
          spawn(found[0])
        })
      }else{
        spawn(settings.exe)
      }

    }else if (settings.command){
      var self = this
      var cmd = this.template(settings.command, id)
      log.info('cmd: ' + cmd)
      this.process = child_process.exec(cmd, options, function(err, stdout, stderr){
        self.stdout = stdout
        self.stderr = stderr
      })
      this.process.on('close', self.onClose.bind(self))
      self.emit('processStarted', self.process)
      if (cb) cb(self.process)
    }
  }
  , template: function(thing, id){
    if (Array.isArray(thing)){
      return thing.map(this.template, this)
    }else{
      var params = {
        url: this.config.get('url') + id,
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
  , onClose: function(code){
    this.exitCode = code
    this.emit('processExit', code, this.stdout, this.stderr)
    this.process = null
  }
  , kill: function(sig, cb){
    if (!this.process){
      if(cb) cb(this.exitCode)
      return
    }
    var process = this.process
    sig = sig || 'SIGTERM'

    var exited = false
    process.on('close', function(code, sig){
      exited = true
      process.stdout.removeAllListeners()
      process.stderr.removeAllListeners()
      process.removeAllListeners()
      if (cb) cb()
    })
    process.kill(sig)
  }
}

module.exports = Launcher
