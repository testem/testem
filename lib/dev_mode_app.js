/*

dev_mode_app.js
===============

This is the entry point for development(TDD) mode.

*/

var Server = require('./server')
var fs = require('fs')
var log = require('winston')
var child_process = require('child_process')
var AppView = require('./appview').AppView
var Path = require('path')
var yaml = require('js-yaml')
var FileWatcher = require('./filewatcher')
var Config = require('./config')
var browser_launcher = require('./browser_launcher')
var Launcher = require('./launcher')
var Backbone = require('backbone')
var EventEmitter = require('events').EventEmitter

function App(config){
    this.config = config

    this.fileWatcher = new FileWatcher
    this.fileWatcher.on('change', this.onFileChanged.bind(this))

    this.url = 'http://localhost:' + this.config.get('port') 
    this.runners = new Backbone.Collection
    // a list of connected browser clients
    this.runners.on('remove', function(runner){
        runner.unbind()
    })

    this.configure(function(){
        this.server = new Server(this)
        with(this.server){
            on('server-start', this.initView.bind(this))
            on('file-requested', this.onFileRequested.bind(this))
        }
        this.server.start()
    })
}

App.prototype = {
    __proto__: EventEmitter.prototype
    , initView: function(){
        this.view = new AppView({
            app: this
        })
        if (this.view.on)
            this.view.on('inputChar', this.onInputChar.bind(this))
        this.initLaunchers()
    }
    , initLaunchers: function(){
        var config = this.config
        var launch_in_dev = config.get('launch_in_dev')
        var launchers = {}
        var self = this
        
        config.getLaunchers(this, function(launchers){
            launchers.forEach(function(launcher){
                log.info('Launching ' + launcher.name)
                    self.on('exit', function(){
                    launcher.kill()
                })
                launcher.start()
            })
        })
    }
    , configure: function(cb){
        var self = this
          , fileWatcher = self.fileWatcher
          , config = self.config
        config.read(function(){
            var watch_files = config.get('watch_files')
            var src_files = config.get('src_files')
            fileWatcher.clear()
            fileWatcher.add(config.get('file'))
            if (config.isCwdMode()){
                fileWatcher.add(process.cwd())
                fs.readdir(process.cwd(), function(err, files){
                    files = files.filter(function(file){
                        return !!file.match(/\.js$/)
                    })
                    fileWatcher.add.apply(fileWatcher, files)
                })
            }
            if (watch_files) {
                if (Array.isArray(watch_files)) {
                    fileWatcher.add.apply(fileWatcher, watch_files)
                } else {
                    fileWatcher.add(watch_files)
                }
            }
            if (src_files) {
                if (Array.isArray(src_files)) {
                    fileWatcher.add.apply(fileWatcher, src_files)
                } else {
                    fileWatcher.add(src_files)
                }
            }
            if (cb) cb.call(self)
        })
    }
    , onFileRequested: function(filepath){
        this.fileWatcher.add(filepath)
    }
    , onFileChanged: function(filepath){
        if (filepath === Path.resolve(this.config.get('file')) ||
            (this.config.isCwdMode() && filepath === process.cwd())){
            // config changed
            this.configure(this.startTests.bind(this))
        }else{
            this.startTests()
        }
    }
    , quit: function(code){
        this.emit('exit')
        setTimeout(function(){
            this.view.cleanup(function(){
                process.exit(code)
            })
        }.bind(this), 100)
    } 
    , onInputChar: function(chr, i) {
        if (chr === 'q')
            this.quit()
        else if (i === 13) // ENTER
            this.startTests()
    }
    , startTests: function(){
        this.runners.forEach(function(runner){
            runner.startTests()
        })
    }
}

module.exports = App