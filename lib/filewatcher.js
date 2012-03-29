var fs = require('fs')
  , glob = require('glob')
  , log = require('util').debug
  , path = require('path')

function FileWatcher(){
    this.cbs = {}
}

FileWatcher.prototype = {
    add: function(){
        for (var i = 0, len = arguments.length; i < len; i++){
            var glob = arguments[i]
            this.watch(glob)
        }
    },
    watch: function(globPattern){
        log('watch(' + globPattern + ')')
        var self = this
          , dir = process.cwd()
        function onAccess(evt, filename){
            log(filename + ' accessed')
            self.onAccess(evt, filename)
        }
        glob(globPattern, function(err, files){
            log('files: ' + JSON.stringify(files))
            files.forEach(function(file){
                file = path.join(dir, file)
                try{
                    log('fs.watch(' + file + ')')
                    fs.watch(file, function(evt, filename){
                        onAccess(evt, file)
                    })
                }catch(e){
                    log('error on watch: ' + e)
                    // Ignore for now
                }
            })
        })
    },
    onAccess: function(evt, filename){
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