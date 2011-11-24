var charm = require('charm')(process),
    spawn = require('child_process').spawn,
    tty = require('tty'),
    log = require('winston')

function AppView(app){
    this.app = app
    this._currentTab = -1
    this.cbs = {init: [], inputChar: []}
    this.cols = this.app.config.cols
    this.lines = this.app.config.lines
    this.init()
}
AppView.prototype = {
    init: function(){
        charm.reset()
        charm.erase('screen')
        charm.on('data', this.onInputChar.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
        this.notify('init')
    },
    notify: function(event, args){
        this.cbs[event].forEach(function(cb){
            cb.apply(null, args)
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
        return 15
    },
    pad: function(str, l, s, t){
        return s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
            + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
            + str + s.substr(0, l - t) : str;
    },
    on: function(event, cb){
        this.cbs[event].push(cb)
    },
    onInputChar: function(buf){
        try{
            var chr = String(buf).charAt(0),
                i = chr.charCodeAt(0)
            if (buf[0] === 27 && buf[1] === 91 && buf[2] === 67)
                this.nextTab()
            else if (buf[0] === 27 && buf[1] === 91 && buf[2] === 68) // left arrow
                this.prevTab()
            this.notify('inputChar', [chr, i])
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
    },
    nextTab: function(){
        log.info('nextTab')
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
        log.info('prevTab')
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
        charm.display('underscore')
        var url = 'http://' + this.app.server.ipaddr + ':' + 
            this.app.server.config.port
        charm
            .position(0, 3)
            .write(url)
        this.reset()
    },
    blankOutLine: function(line){
        charm.position(0, line)
        charm.write(Array(this.cols + 1).join(' '))
    },
    renderBrowserHeaders: function(){
        log.info('num browsers: ' + this.app.server.browsers.length)
        this.blankOutLine(4)
        this.app.server.browsers.forEach(function(browser, idx){
            charm.position(this.colWidth() * idx + 1, 4)
            if (this.currentTab() === idx)
                this.tabStyleOn()
            var str = this.pad(browser.name || '', this.colWidth(), ' ', 2)
            charm.write(str)
            if (this.currentTab() === idx)
                this.reset()
        }.bind(this))
    },
    reset: function(){
        charm.display('reset')
    },
    tabStyleOn: function(){
        charm
            .background('red')
            .display('reverse')
    },
    renderTestResults: function(){
        this.blankOutLine(5)
        this.app.server.browsers.forEach(function(browser, idx){
            if (this.currentTab() === idx)
                this.tabStyleOn()
            var out
            if (browser.results)
                out = browser.results.passed + '/' + browser.results.total
            else
                out = 'N/A'
            charm.position(this.colWidth() * idx + 1, 5)
            charm.write(
                this.pad(out, this.colWidth(), ' ', 2))
            if (this.currentTab() === idx)
                this.reset()
        }.bind(this))
    },
    bottomInstructions: function(){
        if (this.app.server.browsers.length === 0)
            return '[q to quit]'
        else
            return '[Press ENTER to run tests; q to quit]'
    },
    stashCursor: function(){
        charm.position(this.cols, this.lines)
    },
    renderBottomInstructions: function(){
        log.info('writing bottom row at ' + this.lines)
        charm.position(0, this.lines)
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
        if (!browser || (!browser.results && !browser.topLevelError)){
            this.setErrorText('')
            return
        }
        if (browser.topLevelError){
            this.setErrorText(browser.topLevelError)
        }else if (browser.results && browser.results.items){
            var out = browser.results.items.map(function(item){
                return item.name + '\n    ' + 
                    (item.message || 'failed.') + '\n' +
                    (item.stackTrace ? this.indent(item.stackTrace) : '')
            }.bind(this)).join('\n')
            this.setErrorText(out)
        }
        this.stashCursor()
    },
    setErrorText: function(text){
        this.tabStyleOn()
        var lines = text.split('\n')
        lines.slice(0, this.lines - 7).forEach(function(line, i){
            this.writeLine(i + 5, line.substring(0, this.cols - 2))
        }.bind(this))
        var blankLines = this.lines - 7 - lines.length + 1
        for (var i = 0; i < blankLines; i++)
            this.writeLine(lines.length + 5 + i, '')
        this.reset()
    },
    renderAll: function(){
        this.renderTitle()
        this.renderTopInstructions()
        this.renderBrowserHeaders()
        this.renderTestResults()
        this.renderLogPanel()
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
        log.info('cleanup')
        charm.display('reset')
        charm.erase('screen')
        charm.position(0, 0)
        tty.setRawMode(false)
        charm.destroy()
        log.info('destroyed')
        if (cb) cb()
    }
}

module.exports = AppView