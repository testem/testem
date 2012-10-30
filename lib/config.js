/*

config.js
=========

This object returns all config info for the app. It handles reading the `testem.yml` 
or `testem.json` config file.

*/

var fs = require('fs')
  , yaml = require('js-yaml')
  , log = require('winston')
  , path = require('path')
  , async = require('async')
  , browser_launcher = require('./browser_launcher')
  , Launcher = require('./launcher')
  , Chars = require('./chars')
  , pad = require('./strutils').pad

var fileExists = fs.exists || path.exists

function Config(appMode, progOptions){
    this.appMode = appMode
    this.progOptions = progOptions
    this.config = null
}

Config.prototype.read = function(callback){
    var configFile = this.progOptions.file
      , self = this

    if (configFile){
        this.readConfigFile(configFile, callback)
    }else{
        // Try both testem.json and testem.yml
        // testem.json gets precedence
        var files = ['testem.json', 'testem.yml']
        async.filter(files, fileExists, function(matched){
            var configFile = matched[0]
            if (configFile){
                this.readConfigFile(configFile, callback)
            }else{
                if (callback) callback.call(this)
            }
        }.bind(this))
    }
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

Config.prototype.get = function(key){
    if (key in this.progOptions)
        return this.progOptions[key]
    else if (this.config && key in this.config)
        return this.config[key]
    else if (key === 'port')
        // Need to default port manually, since file config
        // will be overwritten by command.js default otherwise.
        return 7357
    else
        return null
}

Config.prototype.isCwdMode = function(){
    return !this.get('src_files') && !this.get('test_page')
}

Config.prototype.getAvailableLaunchers = function(app, cb){
    var self = this
    browser_launcher.getAvailableBrowsers(function(availableBrowsers){
        var availableLaunchers = {}
        availableBrowsers.forEach(function(browser){
            availableLaunchers[browser.name.toLowerCase()] = new Launcher(browser.name, browser, app)
        })
        // add custom launchers
        var customLaunchers = self.get('launchers')
        if (customLaunchers){
            for (var name in customLaunchers){
                availableLaunchers[name.toLowerCase()] = new Launcher(name, customLaunchers[name], app)
            }
        }
        cb(availableLaunchers)
    }.catchem())
}

Config.prototype.getLaunchers = function(app, cb){
    var self = this
    this.getAvailableLaunchers(app, function(availableLaunchers){
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
    return this.getWantedLauncherNames(available).map(function(name){
        return available[name.toLowerCase()]
    })
}

Config.prototype.printLauncherInfo = function(){
    var self = this
    this.getAvailableLaunchers(null, function(launchers){
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

module.exports = Config
