var template = require('../strutils').template
var Process = require('did_it_work')

function HookRunner(config, Proc){
  this.config = config
  this.Process = Proc || Process
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
      proc = this.Process(exe, this.varsub(args || []))
    }else{
      throw new Error('No command or exe/args specified for hook ' + hook)
    }
    this.process = proc
    proc
      .options({cwd: cwd})
      .good(function(){
        callback(null)
      })
      .complete(function(err){
        err = err ? {
          name: hook + ' hook: "' + command + '"',
          message: err.message
        } : null
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
  varsub: function(thing){
    if (Array.isArray(thing)){
      return thing.map(function(str){
        return this.varsub(str)
      }, this)
    }else{
      return template(thing, this.varsubParams())
    }
  },
  stop: function(){
    if (this.process){
      this.process.kill()
    }
  }
}

module.exports = HookRunner