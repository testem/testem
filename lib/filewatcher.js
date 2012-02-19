var fs = require('fs')
  , glob = require('glob')
  , log = require('util').debug
  , path = require('path')

function FileWatcher(){
    this.cbs = {changed: []}
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
          , dir = path.dirname(globPattern)
        function onAccess(evt, filename){
            self.onAccess(evt, filename)
        }
        log('dir: ' + dir)
        glob(globPattern, function(err, files){
            log(files)
            files.forEach(function(file){
                file = path.join(dir, file)
                try{
                    log('Watching ' + file)
                    fs.watch(file, function(evt, filename){
                        log('onaccess')
                        onAccess(evt, filename || file)
                    })
                }catch(e){
                    log('error on watch: ' + e)
                    // Ignore for now
                }
            })
        })
    },
    onAccess: function(evt, filename){
        this.cbs.changed.forEach(function(cb){
            cb(evt, filename)
        })
    },
    on: function(evt, cb){
        if (!this.cbs[evt])
            this.cbs[evt] = []
        this.cbs[evt].push(cb)
    }
}

module.exports = FileWatcher