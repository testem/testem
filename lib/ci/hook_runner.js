var template = require('../strutils').template
var Process = require('did_it_work')
var log = require('winston')

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
    var waitForTextTimeout
    var badText
    var badTextTimeout
    if (typeof hookCfg === 'object'){
      command = hookCfg.command
      exe = hookCfg.exe
      args = hookCfg.args
      waitForText = hookCfg.wait_for_text
      waitForTextTimeout = hookCfg.wait_for_text_timeout
      badText = hookCfg.bad_text
      badTextTimeout = hookCfg.bad_text_timeout
    }else if (typeof hookCfg === 'string'){
      command = hookCfg
    }
    waitForTextTimeout = waitForTextTimeout || 10000
    badTextTimeout = badTextTimeout || waitForTextTimeout
    var proc
    if (command){
      command = this.varsub(command)
      proc = this.Process(command)
    }else if (exe){
      args = this.varsub(args || [])
      proc = this.Process(exe, args)
      command = exe + ' ' + args.join(' ')
    }else{
      throw new Error('No command or exe/args specified for hook ' + hook)
    }
    this.process = proc
    proc
      .options({cwd: cwd})
      .good(function(){
        callback(null)
      })
      .bad(function(data){
        proc.kill()
        callback({
          name: hook + ' hook: "' + command + '"',
          message: data
        })
      })
      .complete(function(err, stdout, stderr){
        err = err ? {
          name: hook + ' hook: "' + command + '"',
          message: err.message
        } : null
        callback(err)
      })
    if (waitForText){
      proc.goodIfMatches(this.varsub(waitForText), waitForTextTimeout)
    }
    if (badText){
      proc.badIfMatches(this.varsub(badText), badTextTimeout)
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