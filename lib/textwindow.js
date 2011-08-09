var curses = require('ncurses'),
    Log = require('log'),
    fs = require('fs'),
    log = new Log(Log.INFO, fs.createWriteStream('ttw.log'))

// http://jsfromhell.com/string/pad
String.prototype.pad = function(l, s, t){
    return s || (s = " "), (l -= this.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + this + s.substr(0, l - t) : this;
};


function TextWindow(options){
    this.options = options
    this.title = options.title
    this.scrollOffset = 0
    this.hscrollOffset = 0
    this.text = null
    this.lines = []
    this.win = new curses.Window(options.height, options.width, options.x, options.y)
    log.info('height: ' + this.win.height + ', width: ' + this.win.width)
    log.info('maxx: ' + this.win.maxx + ', maxy: ' + this.win.maxy)
    this.win.scrollok(true)
    this.win.idlok(true)
    this.win.showCursor = false
    this.win.on('inputChar', this.onInputChar.bind(this))
    this.frame(this.title)
    this.cbs = []
    setTimeout(function(){
        this.refresh()
    }.bind(this), 1)
}
TextWindow.prototype.frame = function(){
    this.win.frame.apply(this.win, arguments)
}
TextWindow.prototype.setText = function(text){
    this.text = text
    this.scrollOffset = 0
    this.hscrollOffset = 0
    this.lines = text.split(/(?:\r|\n|\r\n|\n\r)/)
    this.redraw()
}
TextWindow.prototype.onInputChar = function(ch, i){
    if (this.text !== ''){
        if (i === 67){ // right arrow
            this.hscroll(8)
        }else if (i === 68){ // left arrow
            this.hscroll(-8)
        }else if (i === 258){ // down arrow
            this.scroll(1)
        }else if (i === 259){ // up arrow
            this.scroll(-1)
        }
    }
    this.cbs.forEach(function(cb){
        cb(ch, i)
    })
}
TextWindow.prototype.redraw = function(){
    var numLines = this.win.height + this.scrollOffset - 2
    for (var i = this.scrollOffset; i < numLines; i++){
        var line = this.lines[i] || ''
        line = line.substring(this.hscrollOffset)
            .pad(this.win.maxx - 2, ' ', 1)
            .substring(0, this.win.width - 2)
        this.win.addstr(
            i - this.scrollOffset + 1,
            1, 
            line,
            this.win.maxx - 2)
    }
    this.win.cursor(this.win.height - 1, this.win.width -  1)
    setTimeout(function(){
        this.refresh()
    }.bind(this), 1)   
}
TextWindow.prototype.hscroll = function(n){
    this.hscrollOffset += n
    if (this.hscrollOffset < 0){
        this.hscrollOffset = 0
        return
    }
    this.redraw()
}
TextWindow.prototype.scroll = function(n){
    this.scrollOffset += n
    
    if (this.scrollOffset < 0){
        this.scrollOffset = 0
        return
    }
    if (this.scrollOffset > this.lines.length - (this.win.height - 2)){
        this.scrollOffset = this.lines.length - (this.win.height - 2)
        return
    }
    this.win.scroll(n)
    if (n == 1){
        var line = this.lines[this.scrollOffset + this.win.height - 3]
            .pad(this.win.width - 2, ' ', 1)
        this.win.addstr(this.win.height - 2, 1, String(line), this.win.width - 2)
    }else if (n == -1){
        var line = this.lines[this.scrollOffset].pad(this.win.width - 2, ' ', 1)
        this.win.addstr(1, 1, String(line), this.win.width - 2)
    }
    this.frame(this.title)
    this.win.cursor(this.win.height - 1, this.win.width -  1)
    setTimeout(function(){
        this.win.refresh()
    }.bind(this), 1)
}
TextWindow.prototype.close = function(){
    this.win.close()
}
TextWindow.prototype.refresh = function(){
    this.win.refresh()
}
TextWindow.prototype.on = function(evt, cb){
    if (evt !== 'inputChar') return
    this.cbs.push(cb)
}
TextWindow.prototype.clear = function(){
    this.win.clear()
}

module.exports = TextWindow