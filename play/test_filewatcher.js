var FileWatcher = require('../lib/filewatcher')

var fw = new FileWatcher

fw.add('testem.js')
fw.add('README.md')

fw.on('change', function(filename){
    console.log(filename + ' changed')
})