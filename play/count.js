var curses = require('ncurses')

var win = new curses.Window()
try{
    //curses.colorPair(1, curses.colors.WHITE, 0)
    //win.attrset(curses.colorPair(1))
    win.addstr(0, 0, "1")
    win.refresh()
    setTimeout(function(){
        win.addstr(0, 0, '2')
        
        win.refresh()
        setTimeout(function(){
            win.addstr(0, 0, '3')
            
            win.refresh()
            win.close()
        }, 1000)
    }, 1000)
}catch(e){
    win.close()
}