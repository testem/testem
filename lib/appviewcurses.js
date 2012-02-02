var TextWindow = require('textwindow')
    
function AppView(app){
    this.app = app
    this.curses = require('ncurses')
    this.curses.showCursor = false
    this.win = new this.curses.Window()
    this.win.leaveok(true)
    this.setupErrorWindow()
    this.setupColorPairs()
    this._currentTab = -1
    this.win.on('inputChar', this.onInputChar.bind(this))
    process.on('uncaughtException', function(err){
        this.win.close()
        console.log(err.stack)
        process.exit()
    }.bind(this))
    process.on('SIGINT', function(err){
        this.win.close()
        process.exit()
    }.bind(this))
    this.cbs = []
}
AppView.prototype = {
    setupErrorWindow: function(){
        var height = this.curses.lines - 7
        var width = this.curses.cols
        this.errorWin = new TextWindow({
            title: 'Errors',
            height: height,
            width: width,
            x: 6,
            y: 0
        })
        this.errorWin.on('inputChar', this.onInputChar.bind(this))
    },
    setupColorPairs: function(){
        var idx = 0
        this.curses.colorPair(idx, this.curses.colors.WHITE, this.curses.colors.BLACK)
        this.NORMAL = this.curses.colorPair(idx++)
        this.curses.colorPair(idx, this.curses.colors.GREEN, this.curses.colors.BLACK)
        this.SUCCESS_TAB = this.curses.colorPair(idx++)
        this.curses.colorPair(idx, this.curses.colors.RED, this.curses.colors.BLACK)
        this.FAILURE_TAB = this.curses.colorPair(idx++)
    },
    failedBrowsers: function(){
        return this.browsers().filter(function(b){
            return b.results && b.results.failed > 0
        })
    },
    browsers: function(){
        return this.app.server.browsers
    },
    currentTab: function(){
        return this._currentTab
    },
    colWidth: function(){
        return 12
    },
    pad: function(str, l, s, t){
        return s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
            + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
            + str + s.substr(0, l - t) : str;
    },
    on: function(event, cb){
        if (event === 'inputChar')
            this.cbs.push(cb)
    },
    onInputChar: function(chr, i){
        try{
            log.info('chr: ' + chr + ', i: ' + i)
            if (i === 261)
                this.nextTab()
            else if (i === 260) // left arrow
                this.prevTab()
            this.cbs.forEach(function(cb){
                cb(chr, i)
            })
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
    },
    nextTab: function(){
        if (this.currentTab() >= 0){
            this._currentTab++
            if (this._currentTab >= this.browsers().length)
              this._currentTab = 0
        }else if (this.currentTab() === -1 && 
            this.browsers().length > 0)
            this._currentTab = 0
        this.renderBrowserHeaders()
        this.renderTestResults()
        this.renderLogPanel()
    },
    prevTab: function(){
        if (this.currentTab() >= 0){
            this._currentTab--
            if (this._currentTab < 0)
                this._currentTab = this.browsers().length - 1
        }else if (this.currentTab() === -1 && 
            this.browsers().length > 0)
            this._currentTab = 0
        this.renderBrowserHeaders()
        this.renderTestResults()
        this.renderLogPanel()
    },
    renderTitle: function(){
        this.writeLine(0, "LET\u0027S TEST\u0027EM \u0027SCRIPTS!")
    },
    renderTopInstructions: function(){
        this.writeLine(1, 'Open the URL below in a browser to connect.')
        this.writeLine(2, 'http://' + this.app.server.ipaddr + ':' + 
            this.app.server.config.port + '/')
    },
    renderBrowserHeaders: function(){
        this.app.server.browsers.forEach(function(browser, idx){
            if (this.currentTab() === idx)
                if (!browser.results || browser.results.failed === 0)
                    this.win.attrset(this.SUCCESS_TAB)
                else
                    this.win.attrset(this.FAILURE_TAB)
            this.win.addstr(4, this.colWidth() * idx,
                this.pad(browser.name || '', this.colWidth(), ' ', 2))
            if (this.currentTab() === idx)
                this.win.attrset(this.NORMAL)
        }.bind(this))
    },
    renderTestResults: function(){
        this.app.server.browsers.forEach(function(browser, idx){
            if (this.currentTab() === idx)
                if (!browser.results || browser.results.failed === 0)
                    this.win.attrset(this.SUCCESS_TAB)
                else
                    this.win.attrset(this.FAILURE_TAB)
            var out
            if (browser.results)
                out = browser.results.passed + '/' + browser.results.total
            else
                out = 'N/A'
            this.win.addstr(5, this.colWidth() * idx,
                this.pad(out, this.colWidth(), ' ', 2))
            if (this.currentTab() === idx)
                this.win.attrset(this.NORMAL)
        }.bind(this))
    },
    bottomInstructions: function(){
        if (this.app.server.browsers.length === 0)
            return '[q to quit]'
        else
            return '[Press ENTER to run tests; q to quit]'
    },
    stashCursor: function(){
        this.win.cursor(this.curses.lines - 1, this.bottomInstructions().length)
    },
    renderBottomInstructions: function(){
        this.win.addstr(this.curses.lines - 1, 0, this.bottomInstructions())
    },
    writeLine: function(row, str, col, win){
        if (!win)
            win = this.win
        if (col === undefined)
            col = 0
        win.addstr(row, col, this.pad(str, this.curses.cols, ' ', 1))
    },
    print: function(str, ln, col, win){
        str.split('\n').forEach(function(line){
            this.writeLine(ln++, line, col, win)
        }.bind(this))
    },
    indent: function(text){
        return text.split('\n').map(function(line){
            return '    ' + line
        }).join('\n')
    },
    renderLogPanel: function(){
        var browser = this.app.server.browsers[this.currentTab()]
        if (!browser || !browser.results){
            this.errorWin.setText('')
            return
        }
        if (browser.results.items){
            var out = browser.results.items.map(function(item){
                return item.name + '\n    ' + 
                    (item.message || 'failed.') + '\n' +
                    (item.stackTrace ? this.indent(item.stackTrace) : '')
            }.bind(this)).join('\n')
            this.errorWin.setText(out)
        }
    },
    renderAll: function(){
        this.renderTitle()
        this.renderTopInstructions()
        this.renderBrowserHeaders()
        this.renderTestResults()
        this.renderBottomInstructions()
    },
    refresh: function(){
        setTimeout(function(){
            this.stashCursor()
            this.win.refresh()
        }.bind(this), 1)
    },
    currentBrowser: function(){
        return this.browsers()[this.currentTab()]
    },
    onAllTestResults: function(){
        var browser = this.currentBrowser()
        if (!browser || 
            (browser && browser.results && browser.results.failed === 0))
            this.selectFirstErrorTab()
    },
    selectFirstErrorTab: function(){
        var browsers = this.browsers()
        for (var i = 0, len = browsers.length; i < len; i++){
            var browser = browsers[i]
            if (browser.results && browser.results.failed > 0){
                this._currentTab = i
                return
            }
        }
    },
    cleanup: function(){
        this.win.close()
    }
}

module.exports = AppView