/*

config.js
=========

This object returns all config info for the app. It handles reading the `testem.yml` config file.

*/

var fs = require('fs')
  , yaml = require('js-yaml')

function Config(progOptions){
    this.progOptions = progOptions
    this.config = null
}

Config.prototype.read = function(callback){
    var configFile = this.progOptions.file
      , self = this
      , jsonConfigFile = configFile.replace(/\.yml$/, ".json")

    fs.readFile(configFile, function (err, data) {
        if (err) {
            return fs.readFile(jsonConfigFile, function (err, data) {
                if (!err) {
                    var cfg = JSON.parse(data.toString())
                    self.config = cfg   
                }
                if (callback) callback.call(self)
            })
        }
        var cfg = yaml.load(String(data))
        self.config = cfg
        if (callback) callback.call(self)
    })
}

Config.prototype.get = function(key){
    if (key in this.progOptions)
        return this.progOptions[key]
    else if (this.config && key in this.config)
        return this.config[key]
    else
        return null
}

Config.prototype.isCwdMode = function(){
    return !this.get('src_files') && !this.get('test_page')
}

module.exports = Config