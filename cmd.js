#!/usr/bin/env node
require.paths.unshift(__dirname + '/lib')

var Server = require('server').Server,
    Fs = require('fs'),
    Log = require('log')


function AppView(app){
    this.app = app
    this.curses = require('ncurses')
    this.win = new this.curses.Window()
    this.curses.showCursor = false
    this.win.on('inputChar', this.onInputChar.bind(this))
    process.on('uncaughtException', function(err){
        this.win.close()
        console.log(err.stack)
    }.bind(this))
    process.on('SIGINT', function(err){
        this.win.close()
        process.exit()
    }.bind(this))
    this.cbs = []
}
AppView.prototype = {
    on: function(event, cb){
        if (event === 'inputChar')
            this.cbs.push(cb)
    },
    onInputChar: function(chr, i){
        this.cbs.forEach(function(cb){
            cb(chr, i)
        })
    },
    renderTitle: function(){
        this.win.addstr(0, 0, "LET\u0027S TEST\u0027EM \u0027SCRIPTS!")
    },
    renderTopInstructions: function(){
        this.win.addstr(1, 0, 'Open http://' + this.app.server.ipaddr + ':' + 
            this.app.server.config.port + '/ in a browser to connect.')
    },
    renderBrowserHeaders: function(){
        this.app.log.info('num browsers: ' + this.app.server.browsers.length)
        var text = this.app.server.browsers.map(function(browser){
            return browser.name
        }).join('  ')
        this.app.log.info('text: ' + text)
        this.win.addstr(3, 0, text)
    },
    renderTestResults: function(){
        var text = this.app.server.browsers.map(function(b){
            if (b.results)
                return b.results.passed + '/' + b.results.total
            else
                return ''
        }).join('  ')
        this.win.addstr(4, 0, text)
    },
    renderBottomInstructions: function(){
        var text
        if (this.app.server.browsers.length === 0)
            text = '[q to quit]'
        else
            text = '[Press Enter to run tests; q to quit]'
        this.win.addstr(this.curses.lines - 1, 0, text)
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
            this.win.refresh()
        }.bind(this), 1)
    },
    cleanup: function(){
        this.win.close()
    }
}

function App(config){
    this.log = new Log(Log.INFO, Fs.createWriteStream('app.log'))
    this.config = config
    this.server = new Server(this)
    this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
    this.server.on('test-result', this.onTestResult.bind(this))
    this.server.on('all-test-results', this.onAllTestResults.bind(this))
    this.server.on('server-start', this.initView.bind(this))
}

App.prototype = {
    initView: function(){
        this.view = new AppView(this)
        this.view.renderAll()
        this.view.refresh()
        this.view.on('inputChar', this.onInputChar.bind(this))
    },
    onInputChar: function(chr, i) {
        if (chr === 'q'){
            this.view.cleanup()
            process.exit()
        }else if (i === 10){ // ENTER
            this.startTests()
        }
    },
    startTests: function(){
        this.server.startTests()
    },
    onBrowsersChanged: function(){
        this.view.renderBrowserHeaders()
        this.view.renderTestResults()
        this.view.renderBottomInstructions()
        this.view.refresh()
    },
    onTestResult: function(){
        this.view.renderTestResults()
        this.view.refresh()
    },
    onAllTestResults: function(){
        this.view.renderTestResults()
        this.view.refresh()
    }
}

// App config
var config = {
    port: 3580
}

new App(config)
