/*

config.js
=========

This object returns all config info for the app. It handles reading the `testem.yml` 
or `testem.json` config file.

*/

var fs = require('fs')
var yaml = require('js-yaml')
var log = require('winston')
var path = require('path')
var async = require('async')
var browser_launcher = require('./browser_launcher')
var Launcher = require('./launcher')
var Chars = require('./chars')
var pad = require('./strutils').pad
var isa = require('./isa')
var fileset = require('fileset')
var fileExists = fs.exists || path.exists

function Config(appMode, progOptions, config){
  this.appMode = appMode
  this.progOptions = progOptions || {}
  this.config = config || {}
}

Config.prototype.read = function(callback){
  var configFile = this.progOptions.file
    , self = this

  if (configFile){
    this.readConfigFile(configFile, callback)
  }else{
    // Try both testem.json and testem.yml
    // testem.json gets precedence
    var files = ['testem.json', '.testem.json', '.testem.yml', 'testem.yml']
    async.filter(files.map(this.resolvePath.bind(this)), fileExists, function(matched){
      var configFile = matched[0]
      if (configFile){
        this.readConfigFile(configFile, callback)
      }else{
        if (callback) callback.call(this)
      }
    }.bind(this))
  }
}

Config.prototype.resolvePath = function(filepath){
  if (filepath[0] === "/") {
    return filepath
  }

  return path.join(this.cwd(), filepath)
}

Config.prototype.reverseResolvePath = function(filepath){
  return path.relative(this.cwd(), filepath)
}

Config.prototype.cwd = function(){
  return this.get('cwd') || process.cwd()
}

Config.prototype.readConfigFile = function(configFile, callback){
  var self = this
  if (configFile.match(/\.json$/)){
    this.readJSON(configFile, callback)
  }else if (configFile.match(/\.yml$/)){
    this.readYAML(configFile, callback)
  }else{
    log.error('Unrecognized config file format for ' + configFile)
    if (callback) callback.call(self)
  }
}

Config.prototype.readYAML = function(configFile, callback){
  var self = this
  fs.readFile(configFile, function (err, data) {
    if (!err){
      var cfg = yaml.load(String(data))
      self.config = cfg
    }
    if (callback) callback.call(self)
  })
}

Config.prototype.readJSON = function(configFile, callback){
  var self = this
  fs.readFile(configFile, function (err, data) {
    if (!err){
      var cfg = JSON.parse(data.toString())
      self.config = cfg
      self.progOptions.file = configFile
    }
    if (callback) callback.call(self)
  })
}

Config.prototype.defaults = {
  host: 'localhost',
  port: 7357,
  url: function(){
    return 'http://' + this.get('host') + ':' + this.get('port') + '/'
  }
}

Config.prototype.get = function(key){
  var retval = null
  if (key in this.progOptions){
    retval = this.progOptions[key]
  }
  if (retval == null && this.config && key in this.config)
    retval = this.config[key]
  if (!retval && (key in this.defaults)){
    var defaultVal = this.defaults[key]
    if (typeof defaultVal === 'function'){
      return defaultVal.call(this)
    }else{
      return defaultVal
    }
  }
  return retval
}

Config.prototype.set = function(key, value){
  if (!this.config) this.config = {}
  this.config[key] = value
}

Config.prototype.isCwdMode = function(){
  return !this.get('src_files') && !this.get('test_page')
}

Config.prototype.getAvailableLaunchers = function(cb){
  var self = this
  browser_launcher.getAvailableBrowsers(function(availableBrowsers){
    var availableLaunchers = {}
    availableBrowsers.forEach(function(browser){
      var newLauncher = new Launcher(browser.name, browser, self)
      availableLaunchers[browser.name.toLowerCase()] = newLauncher
        
    })
    // add custom launchers
    var customLaunchers = self.get('launchers')
    if (customLaunchers){
      for (var name in customLaunchers){
        var newLauncher = new Launcher(name, customLaunchers[name], self)
        availableLaunchers[name.toLowerCase()] = newLauncher
      }
    }
    cb(availableLaunchers)
  })
}

Config.prototype.getLaunchers = function(cb){
  var self = this
  this.getAvailableLaunchers(function(availableLaunchers){
    cb(self.getWantedLaunchers(availableLaunchers))
  })
}

Config.prototype.getWantedLauncherNames = function(available){
  var launchers, skip
  launchers = (
    (launchers = this.get('launch')) ? 
      launchers.split(',') : 
      (
        this.appMode === 'dev' ? 
          this.get('launch_in_dev') || []:
          this.get('launch_in_ci') || Object.keys(available)
      )
  )
  if (skip = this.get('skip')){
    skip = skip.split(',')
    launchers = launchers.filter(function(name){
      return skip.indexOf(name) === -1
    })
  }
  return launchers
}

Config.prototype.getWantedLaunchers = function(available){
  var launchers = []
  var wanted = this.getWantedLauncherNames(available)
  wanted.forEach(function(name){
    var launcher = available[name.toLowerCase()]
    if (!launcher){
      log.warn('Launcher "' + name + '" is not recognized.')
    }else{
      launchers.push(launcher)
    }
  })
  return launchers
}

Config.prototype.printLauncherInfo = function(){
  var self = this
  this.getAvailableLaunchers(function(launchers){
    var launch_in_dev = (self.get('launch_in_dev') || [])
      .map(function(s){return s.toLowerCase()})
    var launch_in_ci = self.get('launch_in_ci')
    if (launch_in_ci){
      launch_in_ci = launch_in_ci.map(function(s){return s.toLowerCase()})
    }
    launchers = Object.keys(launchers).map(function(k){return launchers[k]})
    console.log('Have ' + launchers.length + ' launchers available; auto-launch info displayed on the right.')
    console.log() // newline
    console.log('Launcher      Type          CI  Dev')
    console.log('------------  ------------  --  ---')
    console.log(launchers.map(function(launcher){
      var protocol = launcher.settings.protocol
      var kind = protocol === 'browser' ? 
        'browser' : (
          protocol === 'tap' ?
            'process(TAP)' : 'process')
      var color = protocol === 'browser' ? 'green' : 'magenta'
      var dev = launch_in_dev.indexOf(launcher.name.toLowerCase()) !== -1 ? 
        Chars.mark : 
        ' '
      var ci = !launch_in_ci || launch_in_ci.indexOf(launcher.name.toLowerCase()) !== -1 ? 
        Chars.mark : 
        ' '
      return (pad(launcher.name, 14, ' ', 1) +
        pad(kind, 12, ' ', 1) +
        '  ' + ci + '    ' + dev + '      ')
    }).join('\n'))
  })
}



Config.prototype.getFileSet = function(want, dontWant, callback){
  var self = this
  if (isa(want, String)) want = [want] // want is an Array
  if (isa(dontWant, Array)) dontWant = dontWant.join(' ') // dontWant is a String
  async.reduce(want, [], function(allThatIWant, patternEntry, next){
    var pattern = isa(patternEntry, String) ? patternEntry : patternEntry.src
    var attrs = patternEntry.attrs || []
    fileset([self.resolvePath(pattern)], dontWant, function(err, files){
      if (err) return next(err, allThatIWant)
      next(null, allThatIWant.concat(files.map(function(f){
        f = self.reverseResolvePath(f)
        return {src: f, attrs: attrs} 
      })))
    })
  }, function(err, fileEntries){
    if (err) return callback(err)
    callback(null, fileEntries)
  })
}

Config.prototype.getSrcFiles = function(callback){
  var srcFiles = this.get('src_files') || '*.js'
  var srcFilesIgnore = this.get('src_files_ignore') || ''
  this.getFileSet(srcFiles, srcFilesIgnore, callback)
}

Config.prototype.getServeFiles = function(callback){
  var want = this.get('serve_files') || this.get('src_files') || '*.js'
  var dontWant = this.get('serve_files_ignore') || this.get('src_files_ignore') || ''
  this.getFileSet(want, dontWant, callback)
}

Config.prototype.getAllOptions = function(){
  var options = []
  function getOptions(o){
    if (!o) return
    if (o.options){
      o.options.forEach(function(o){
        options.push(o.name())
      })
    }
    getOptions(o.parent)
  }
  getOptions(this.progOptions)
  return options
}

Config.prototype.getTemplateData = function(cb){
  var ret = {}
  var options = this.getAllOptions()
  for (var key in this.progOptions){
    if (options.indexOf(key) !== -1){
      ret[key] = this.progOptions[key]
    }
  }
  if (this.config){
    for (var key in this.config){
      ret[key] = this.config[key]
    }
  }
  this.getServeFiles(function(err, files){
    ret.serve_files = files
    if (cb) cb(err, ret)
  })
}

module.exports = Config
