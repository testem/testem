var curses=require('ncurses')
var win = new curses.Window()
try{
    //curses.colorPair(1, curses.colors.WHITE, 0)
    //win.attrset(curses.colorPair(1))
    var line = 0
    win.addstr(line++, 0, "LET\u0027S TEST\u0027EM \u0027SCRIPTS!")
    win.addstr(line++, 0, 'Open http://192.168.1.114:3985/ in a browser to connect.')
    win.addstr(line++, 0, 'Connected Browsers')
    win.addstr(line++, 0, 'Firefox 5.0  IE 7.0  IE 8.0   Chrome 11.0')
    win.addstr(line++, 0, '12/12        10/12   11/12    12/12')
    
    //win.addstr(2, 0, 'Supports mouse? ' + curses.hasMouse)
    win.addstr(curses.lines - 1, 0, '[Press ENTER to run tests; q to quit]')
    win.on('inputChar', function (chr, i) {
        if (chr === 'q')
            win.close()
    })
    win.refresh()
}catch(e){
    win.close()
}
