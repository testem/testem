var glob = require('glob')

glob('tests/data/', function(err, files){
    if (files)
        console.log(files.join('\n'))
    else
        console.log('No files matched.')
})