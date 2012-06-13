var fs = require('fs')
  , glob = require('glob')
  , log = require('util').debug
  , path = require('path')
  , EventEmitter = require('events').EventEmitter

function FileWatcher(){
    this.fileInfo = {} // a map of file info, key by filepath
}

FileWatcher.prototype = {
    __proto__: EventEmitter.prototype,
    clear: function(){
        for (var path in this.fileInfo){
            var info = this.fileInfo[path]
            if (info.watcher){
                info.watcher.close()
            }
            try{
                fs.unwatchFile(path)
            }catch(e){}
        }
        this.fileInfo = {}
        this.emit('clear')
    },
    printWatched: function(){
        for (var path in this.fileInfo){
            console.log(path)
        }
    },
    add: function(){
        for (var i = 0; i < arguments.length; i++){
            var glob = arguments[i]
            this.watch(glob)
            this.emit('add', 'glob')
        }
    },
    isWatching: function(path){
        return path in this.fileInfo
    },
    getFileInfo: function(path){
        if (!(path in this.fileInfo))
            this.fileInfo[path] = {}
        return this.fileInfo[path]
    },
    watch: function(globPattern){
        var self = this
          , dir = process.cwd()

        glob(globPattern, function(err, files){
            files.forEach(function(file){
                file = path.join(dir, file)
                if (self.isWatching(file)) return
                fs.stat(file, function(err, stats){
                    if (err) return
                    var fileInfo = self.getFileInfo(file)
                    fileInfo.lastModTime = +stats.mtime
                    fileInfo.watcher = fs.watch(
                        file
                        , function(evt){
                            self.onAccess(evt, file)
                        }
                    )
                    try{
                        fs.watchFile(file, function(curr, prev){
                            if (curr.mtime !== prev.mtime){
                                self.onAccess('change', file)
                            }
                        })
                    }catch(e){}
                })
            })
        })
    },
    onAccess: function(evt, filename){
        var self = this
        fs.stat(filename, function(err, stats){
            if (err) return
            var fileInfo = self.getFileInfo(filename)
            var lastMTime = fileInfo.lastModTime
            if (!lastMTime || (stats.mtime > lastMTime)){
                self.emit('change', filename)
                fileInfo.lastModTime = +stats.mtime
            }
        })
    }
}

module.exports = FileWatcher