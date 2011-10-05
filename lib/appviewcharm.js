var charm = require('charm')(process),
    spawn = require('child_process').spawn,
    tty = require('tty'),
    log = require('winston')

function AppView(app){
    log.info('cnstr')
    this.app = app
    this._currentTab = -1
    this.cbs = {init: [], inputChar: []}
    this.init()
}
AppView.prototype = {
    init: function(){
        charm.reset()
        log.info('init')
        var tputCols = spawn('tput', ['cols'])
        tputCols.stdout.on('data', function(data){
            this.cols = Number(String(data))
            log.info('cols: ' + this.cols)
            if (this.cols && this.lines)
                this.notify('init')
        }.bind(this))
        var tputRows = spawn('tput', ['lines'])
        tputRows.stdout.on('data', function(data){
            log.info('got data')
            this.lines = Number(String(data)) - 3
            log.info('lines: ' + this.lines)
            if (this.cols && this.lines)
                this.notify('init')
        }.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
    },
    notify: function(event){
        
        this.cbs[event].forEach(function(cb){
            cb()
        })
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
        return 14
    },
    pad: function(str, l, s, t){
        return s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
            + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
            + str + s.substr(0, l - t) : str;
    },
    on: function(event, cb){
        this.cbs[event].push(cb)
    },
    onInputChar: function(chr, i){
        try{
            log.info('chr: ' + chr + ', i: ' + i)
            if (i === 261)
                this.nextTab()
            else if (i === 260) // left arrow
                this.prevTab()
            this.cbs.inputChar.forEach(function(cb){
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
        log.info('num browsers: ' + this.app.server.browsers.length)
        this.app.server.browsers.forEach(function(browser, idx){
            charm.position(this.colWidth() * idx, 4)
            charm.write(
                this.pad(browser.name || '', this.colWidth(), ' ', 2))
        }.bind(this))
    },
    renderTestResults: function(){
        
        this.app.server.browsers.forEach(function(browser, idx){
            var out
            if (browser.results)
                out = browser.results.passed + '/' + browser.results.total
            else
                out = 'N/A'
            charm.position(this.colWidth() * idx, 5)
            charm.write(
                this.pad(out, this.colWidth(), ' ', 2))
        }.bind(this))
        
    },
    bottomInstructions: function(){
        if (this.app.server.browsers.length === 0)
            return '[q to quit]'
        else
            return '[Press ENTER to run tests; q to quit]'
    },
    stashCursor: function(){
        //this.win.cursor(this.lines - 1, this.bottomInstructions().length)
    },
    renderBottomInstructions: function(){
        charm.position(0, this.lines - 1)
        charm.write(this.bottomInstructions())
    },
    writeLine: function(row, str, col, win){
        var out = this.pad(str, this.cols, ' ', 1)
        if (!win)
            win = this.win
        if (col === undefined)
            col = 0
        charm
            .position(col, row + 1)
            .write(out)
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
            //this.errorWin.setText('')
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
    cleanup: function(cb){
        charm.display('reset')
        charm.position(0, this.lines)
        setTimeout(function(){
            charm.erase('screen')
            charm.position(0, 0)
            tty.setRawMode(false)
            charm.destroy()
            if (cb) cb()
        }, 500)
    }
}

module.exports = AppView