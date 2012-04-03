var fs = require('fs')
  , glob = require('glob')
  , log = require('util').debug
  , path = require('path')

function FileWatcher(){
    this.cbs = {}
    this.lastModTime = {}
}

FileWatcher.prototype = {
    add: function(){
        for (var i = 0, len = arguments.length; i < len; i++){
            var glob = arguments[i]
            this.watch(glob)
        }
    },
    watch: function(globPattern){
        var self = this
          , dir = process.cwd()

        glob(globPattern, function(err, files){
            files.forEach(function(file){
                file = path.join(dir, file)
                fs.stat(file, function(err, stats){
                    if (err) return
                    self.lastModTime[file] = +stats.mtime
                    fs.watch(file, function(evt){
                        self.onAccess(evt, file)
                    })
                })
            })
        })
    },
    onAccess: function(evt, filename){
        fs.stat(filename, function(err, stats){
            if (err) return
            var lastMTime = this.lastModTime[filename]
            if (!lastMTime || (stats.mtime > lastMTime)){
                this.onChange(evt, filename)
                this.lastModTime[filename] = +stats.mtime
            }
        }.bind(this))
    },
    onChange: function(evt, filename){
        this.cbs.change.forEach(function(cb){
            cb('change', filename)
        })
    },
    on: function(evt, cb){
        if (!this.cbs[evt])
            this.cbs[evt] = []
        this.cbs[evt].push(cb)
    }
}

module.exports = FileWatcher