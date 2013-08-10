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
var FileWatcher = require('./filewatcher')
var Config = require('./config')
var browser_launcher = require('./browser_launcher')
var Launcher = require('./launcher')
var BaseApp = require('./base_app')
var StyledString = require('styled_string')

function App(config){
  var self = this
  BaseApp.call(this, config)
  this.fileWatcher = new FileWatcher
  this.fileWatcher.on('change', this.onFileChanged.bind(this))
  this.fileWatcher.on('emfile', this.onEMFILE.bind(this))
  this.fileWatcher.on('fw-error', this.onGeneralWatcherError.bind(this))

  // a list of connected browser clients
  this.runners.on('remove', function(runner){
    runner.unbind()
  })

  this.configure(function(){
    this.server = new Server(config)
    with(this.server){
      on('server-start', this.initView.bind(this))
      on('file-requested', this.onFileRequested.bind(this))
      on('browser-login', this.onBrowserLogin.bind(this))
    }
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

    self.startOnStartHook(function(proc){
      self.startTests(function(){
        self.initLaunchers()
      })
    })

    if (self.onStartProcess){
      self.onStartProcess.bad(function(err, stdout, stderr){
        self.onStartProcess.kill('SIGTERM')

        var message = err.message || stdout + '\n' + stderr
        self.view.setErrorPopupMessage(
          'Error from on_start hook: \n' + 
          message)
      })
    }
        
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
        self.watchFiles(watch_files)
      }
      config.getSrcFiles(function(err, files){
        self.watchFiles(files.map(function(f){ return f.src }))
      })
      if (cb) cb.call(self)
    })
  }
  , watchFiles: function(files){
    var fileWatcher = this.fileWatcher
    if (Array.isArray(files)) {
      fileWatcher.add.apply(fileWatcher, files)
    } else {
      fileWatcher.add(files)
    }
  }
  , onFileRequested: function(filepath){
    if (!this.config.get('serve_files')){
      this.fileWatcher.add(filepath)
    }
  }
  , onFileChanged: function(filepath){
    if (this.disableFileWatch) return
    log.info(filepath + ' changed.')
    var configFile = this.config.get('file')
    if ((configFile && filepath === Path.resolve(configFile)) ||
      (this.config.isCwdMode() && filepath === process.cwd())){
      // config changed
      this.configure(this.startTests.bind(this))
    }else{
      var self = this
      this.startTests()
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
  , onGeneralWatcherError: function(message){
    log.error('Error from fireworm: ' + message)
  }
  , onBrowserLogin: function(browserName, id, client){
    this.connectBrowser(browserName, id, client)
  }
  , quit: function(code, err){
    var self = this
    this.emit('exit')
    this.cleanUpLaunchers(function(){
      self.runExitHook(function(){
        if (self.view) self.view.cleanup(die)
        else die()
        function die(){
          if (err) console.error(err.stack)
          process.exit(code)
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
      this.runPreprocessors(function(err, stdout, stderr, command){
        if (err){
          var titleText = 'Error running before_tests hook: ' + command
          var title = StyledString(titleText + '\n ').foreground('red')
          var errMsgs = StyledString('\n' + stdout).foreground('yellow')
            .concat(StyledString('\n' + stderr).foreground('red'))
          view.setErrorPopupMessage(title.concat(errMsgs))
          log.log( 'warn'
                 , titleText
                 , { command: command
                   , stdout: stdout
                   , stderr: stderr
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
