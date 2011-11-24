var spawn = require('child_process').spawn
function getTermSize(cb){
    var cols, lines
    spawn('tput', ['cols']).stdout.on('data', function(data){
        cols = Number(data)
        if (cols && lines && cb)
            cb(cols, lines)
    })
    spawn('tput', ['lines']).stdout.on('data', function(data){
        lines = Number(data)
        if (cols && lines && cb)
            cb(cols, lines)
    })
}

module.exports = getTermSize