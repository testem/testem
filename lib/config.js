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

var fileExists = fs.exists || path.exists

function Config(progOptions){
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
    log.info('readYAML')
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
    log.info('readJSON')
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

module.exports = Config
