/*

dev_mode_app.js
===============

This is the entry point for development(TDD) mode.

*/

var Server = require('./server')
var fs = require('fs')
var log = require('winston')
var AppView = require('./ui/appview')
var Path = require('path')
var yaml = require('js-yaml')
var fireworm = require('fireworm')
var Config = require('./config')
var browser_launcher = require('./browser_launcher')
var Launcher = require('./launcher')
var BaseApp = require('./base_app')
var StyledString = require('styled_string')

function App(config, finalizer){
  var self = this
  BaseApp.call(this, config)
  this.exited = false
  this.finalizer = finalizer || process.exit
  this.fileWatcher = fireworm('./')
  this.fileWatcher.on('change', this.onFileChanged.bind(this))
  this.fileWatcher.on('emfile', this.onEMFILE.bind(this))
  
  // a list of connected browser clients
  this.runners.on('remove', function(runner){
    runner.unbind()
  })

  this.configure(function(){
    this.server = new Server(config)
    this.server.on('server-start', this.initView.bind(this))
    this.server.on('file-requested', this.onFileRequested.bind(this))
    this.server.on('browser-login', this.onBrowserLogin.bind(this))
    this.server.on('server-error', this.onServerError.bind(this))
    this.server.start()
  })

  process.on('uncaughtException', function(err){
    self.quit(1, err)
  })

}

App.prototype = {
  __proto__: BaseApp.prototype
  , start: function(){}
  , initView: function(){
    var self = this
    var view = this.view = new AppView({
      app: this
    })
    if (this.view.on)
      this.view.on('inputChar', this.onInputChar.bind(this))
        
    this.on('all-runners-complete', function(){
      self.runPostprocessors()
    })

    self.startOnStartHook(function(err){
      if (err){
        var titleText = 'Error running on_start hook'
        var title = StyledString(titleText + '\n ').foreground('red')
        var errMsgs = StyledString('\n' + err.name).foreground('white')
          .concat(StyledString('\n' + err.stdout).foreground('yellow'))
          .concat(StyledString('\n' + err.stderr).foreground('red'))
        view.setErrorPopupMessage(title.concat(errMsgs))
        log.log( 'warn'
               , titleText
               , { name: err.name
                 , stdout: err.stdout
                 , stderr: err.stderr
                 }
               )
        return
      } else {
        self.startTests(function(){
          self.initLaunchers()
        })
      }
    })        
  }
  , initLaunchers: function(){
    var config = this.config
    var launch_in_dev = config.get('launch_in_dev')
    var self = this
        
    config.getLaunchers(function(launchers){
      self.launchers = launchers
      launchers.forEach(function(launcher){
        log.info('Launching ' + launcher.name)
        self.on('exit', function(){
          launcher.kill()
        })
        'SIGINT SIGTERM SIGHUP'.split(' ').forEach(function(evt){
          process.on(evt, function(){
            launcher.kill()
          })
        })
        launcher.start()
        if (launcher.runner){
          self.runners.push(launcher.runner)
          
        }
      })
    })
  }
  , configure: function(cb){
    var self = this
      , fileWatcher = self.fileWatcher
      , config = self.config
    config.read(function(){
      var watch_files = config.get('watch_files')
      fileWatcher.clear()
      var confFile = config.get('file')
      if (confFile){
        fileWatcher.add(confFile)
      }
      if (config.isCwdMode()){
        fileWatcher.add('*.js')
      }
      if (watch_files) {
        self.watchFiles(watch_files)
      }
      var srcFiles = config.get('src_files') || '*.js'
      self.watchFiles(srcFiles)
      self.fileWatcher.crawl(function(){
        if (cb) cb.call(self)
      })
    })
  }
  , watchFiles: function(thing){
    var fileWatcher = this.fileWatcher
    if (Array.isArray(thing)) {
      thing.forEach(function(file){
        fileWatcher.add(file)
      })
    } else {
      fileWatcher.add(thing)
    }
  }
  , onFileRequested: function(filepath){
    if (!this.config.get('serve_files')){
      this.fileWatcher.add(filepath)
    }
  }
  , onFileChanged: function(filepath){
    log.info(filepath + ' changed ('+(this.disableFileWatch ? 'disabled' : 'enabled')+').')
    if (this.disableFileWatch) return
    var configFile = this.config.get('file')
    if ((configFile && filepath === Path.resolve(configFile)) ||
      (this.config.isCwdMode() && filepath === process.cwd())){
      // config changed
      this.configure(this.startTests.bind(this))
    }else{
      this.runHook('on_change', {file: filepath}, this.startTests.bind(this))
    }
  }
  , onEMFILE: function(){
    var view = this.view
    var text = [
      'The file watcher received a EMFILE system error, which means that ',
      'it has hit the maximum number of files that can be open at a time. ',
      'Luckily, you can increase this limit as a workaround. See the directions below \n \n',
      'Linux: http://stackoverflow.com/a/34645/5304\n',
      'Mac OS: http://serverfault.com/a/15575/47234'
    ].join('')
    view.setErrorPopupMessage(StyledString(text + '\n ').foreground('megenta'))
  }
  , onServerError: function(err){
    this.quit(1, err)
  }
  , onGeneralWatcherError: function(message){
    log.error('Error from fireworm: ' + message)
  }
  , onBrowserLogin: function(browserName, id, client){
    this.connectBrowser(browserName, id, client)
  }
  , quit: function(code, err){
    if (this.exited) return

    var self = this
    this.emit('exit')
    this.cleanUpLaunchers(function(){
      self.runExitHook(function(){
        if (self.view) self.view.cleanup(die)
        else die()
        function die(){
          if (err) console.error(err.stack)
          self.finalizer(code)
          self.exited = true
        }
      })
    })
  } 
  , onInputChar: function(chr, i) {
    var self = this
    if (chr === 'q') {
      log.info('Got keyboard Quit command')
      this.quit()
    }
    else if (i === 13){ // ENTER
      log.info('Got keyboard Start Tests command')
      this.startTests()
    }
  }
  , startTests: function(callback){
    try{
      var view = this.view
      var runners = this.runners
      this.runPreprocessors(function(err){
        if (err){
          var titleText = 'Error running before_tests hook'
          var title = StyledString(titleText + '\n ').foreground('red')
          var errMsgs = StyledString('\n' + err.name).foreground('white')
            .concat(StyledString('\n' + err.stdout).foreground('yellow'))
            .concat(StyledString('\n' + err.stderr).foreground('red'))
          view.setErrorPopupMessage(title.concat(errMsgs))
          log.log( 'warn'
                 , titleText
                 , { name: err.name
                   , stdout: err.stdout
                   , stderr: err.stderr
                   }
                 )
          return
        }else{
          view.clearErrorPopupMessage()
          runners.forEach(function(runner){
            runner.startTests()
          })
          if (callback) callback()
        }
      })
    }catch(e){
      log.info(e.message)
      log.info(e.stack)
    }
  }
}

module.exports = App
