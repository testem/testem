var child_process = require('child_process')
var EventEmitter = require('events').EventEmitter
var log = require('winston')
var fs = require('fs')
var fileExists = fs.exists || path.exists
var async = require('async')
var ProcessRunner = require('./runners').ProcessRunner

function Launcher(name, settings, app){
	this.name = name
	this.app = app
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
			var app = this.app
			app.runners.push(new ProcessRunner({
                app: app
                , launcher: self
            }))
		}else{
			this.launch()
		}
	}
	, launch: function(cb){
		var app = this.app
		var url = app.url
		var settings = this.settings
		this.kill()
		if (settings.setup){
			var self = this
			settings.setup(app, function(){
				self.doLaunch(cb)
			})
		}else{
			this.doLaunch(cb)
		}
	}
	, doLaunch: function(cb){
		var app = this.app
		var url = app.url
		var settings = this.settings
		var self = this
		if (settings.exe){

			function spawn(exe){
				self.process = child_process.spawn(exe, args)
				self.process.once('exit', self.onExit.bind(self))
				self.emit('processStarted', self.process)
				if (cb) cb(self.process)
			}

			var args = [url]
			if (settings.args instanceof Array)
	            args = settings.args.concat(args)
	        else if (settings.args instanceof Function)
	            args = settings.args(app)

			if (Array.isArray(settings.exe)){
                async.filter(settings.exe, fileExists, function(found){
                    spawn(found[0])
                })
            }else{
                spawn(settings.exe)
            }
			
		}else if (settings.command){
			this.process = child_process.exec(settings.command)
			this.process.once('exit', self.onExit.bind(self))
			self.emit('processStarted', self.process)
			if (cb) cb(self.process)
		}
	}
	, onExit: function(){
		this.emit('processExit')
		this.process = null
	}
	, kill: function(sig, cb){
		if (!this.process) return
		sig = sig || 'SIGKILL'
		if (cb){
			this.process.once('exit', cb)
		}
		this.process.kill(sig)
	}
}

module.exports = Launcher