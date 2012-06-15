/*

gettermsize.js
==============

This utility gets the current size of the terminal.

Example usage:

    var getTermSize = require('gettermsize')
    getTermSize(function(cols, lines){
        // You have the terminal size!
    })

*/
function getTermSize(cb){
    var tty
    if (process.stdout.getWindowSize)
        cb.apply(null, process.stdout.getWindowSize())
    else if (tty = require('tty') && tty.getWindowSize){
        cb.apply(null, tty.getWindowSize(process.stdout))
    }else{
        var spawn = require('child_process').spawn
        var p = spawn('resize')
        p.stdout.on('data', function(data){
            data = String(data)
            var lines = data.split('\n'),
                cols = Number(lines[0].match(/^COLUMNS=([0-9]+);$/)[1]),
                lines = Number(lines[1].match(/^LINES=([0-9]+);$/)[1])
            if (cb)
                cb(cols, lines)
        })
    }
}

module.exports = getTermSize