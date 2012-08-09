/*

dev_mode_app.js
===============

This is the entry point for development(TDD) mode.

*/

var Server = require('./server')
  , fs = require('fs')
  , log = require('winston')
  , child_process = require('child_process')
  , AppView = require('./appview').AppView
  , Path = require('path')
  , yaml = require('js-yaml')
  , FileWatcher = require('./filewatcher')
  , Config = require('./config')
  , browser_launcher = require('./browser_launcher')
  , Launcher = require('./launcher')
  , Backbone = require('backbone')
  , ProcessClient = require('./runner_clients').ProcessClient

function App(progOptions){
    this.config = new Config(progOptions)

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
    initView: function(){
        this.view = new AppView({
            app: this
        })
        if (this.view.on)
            this.view.on('inputChar', this.onInputChar.bind(this))
        this.initLaunchers()
    }
    , initLaunchers: function(){
        log.info('initLaunchers')
        var config = this.config
          , auto_launch_in_dev = config.get('auto_launch_in_dev')
          , launchers = {}
          , self = this

        this.availableLaunchers = launchers
        this.activeLaunchers = []

        browser_launcher.getAvailableBrowsers(function(availableBrowsers){try{
            log.info('availableBrowsers: ' + availableBrowsers)
            availableBrowsers.forEach(function(browser){
                launchers[browser.name] = new Launcher(browser.name, browser, self)
            })

            // add custom launchers
            var customLaunchers = config.get('launchers')
            if (customLaunchers){
                for (var name in customLaunchers){
                    log.info('Installing custom launcher ' + name)
                    launchers[name] = new Launcher(name, customLaunchers[name], self)
                }
            }

            //log.info(JSON.stringify(launchers, null, '  '))

            // auto launch
            if (auto_launch_in_dev){
                auto_launch_in_dev.forEach(function(name){
                    log.info('launching ' + name)
                    
                    var launcher = launchers[name]
                    self.activeLaunchers.push(launcher)
                    if (!launcher){
                        log.error('Undefined launcher "' + name + '". Unable to auto-start.')
                    }else{
                        log.info('Launching ' + name)
                    }
                    
                    log.info('launcher ' + launcher.name + ' launching')
                    
                    var protocol = launcher.settings.protocol
                    if (protocol === 'tap' || protocol === undefined){
                        var client = new ProcessClient({
                            app: self
                            , launcher: launcher
                        })

                        self.runners.push(client)
                    }else{
                        launcher.launch()
                    }

                })
            }
        }catch(e){ log.info(e.message); log.info(e.stack);}}) 
        log.info('done with initLaunchers')
    }
    , killLaunchers: function(){
        this.activeLaunchers.forEach(function(l){
            l.kill()
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
            if (config.isCwdMode())
                fileWatcher.add(process.cwd())
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
        this.killLaunchers()
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