require.paths.unshift('./lib')


var TextWindow = require('textwindow'),
    curses = require('ncurses'),
    fs = require('fs')
    
var text = null
var parent = new curses.Window()
var win = new TextWindow({
    title: 'zombie.js',
    height: curses.lines - 10,
    width: curses.cols - 10,
    x: 5,
    y: 5
})

fs.readFile('zombie.js', function(err, data){
    text = String(data)
    win.setText(text)
})

win.on('inputChar', function(chr, i){
    if (chr === 'q'){
        parent.close()
        win.close()
        process.exit()
    }else if (chr === 'a'){
        win.setText('')
    }else if (chr === 't'){
        win.setText(text)
    }
})
process.on('uncaughtException', function(e){
    win.close()
    win.log.info(e)
    process.exit()
})