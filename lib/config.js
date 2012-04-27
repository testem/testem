var fs = require('fs')
  , yaml = require('js-yaml')

function Config(progOptions){
    this.progOptions = progOptions
    this.config = null
}

Config.prototype = {
    read: function(callback){
        var configFile = this.progOptions.file
          , self = this
        fs.readFile(configFile, function(err, data){
            if (!err){
                var cfg = yaml.load(String(data))
                self.config = cfg
            }
            if (callback) callback.call(self)
        })
    },
    get: function(key){
        if (key in this.progOptions)
            return this.progOptions[key]
        else if (this.config && key in this.config)
            return this.config[key]
        else
            return null
    }
}

module.exports = Config