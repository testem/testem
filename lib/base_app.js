var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var BrowserRunner = require('./runners').BrowserRunner
var exec = require('child_process').exec
var log = require('winston')

function BaseApp(config){
    this.config = config
    this.runners = new Backbone.Collection
    this.url = 'http://localhost:' + this.config.get('port') 
}
BaseApp.prototype = {
    __proto__: EventEmitter.prototype
    , runPreprocessors: function(callback){
        var self = this
        var config = this.config
        if (config.get('before_tests')){
            this.disableFileWatch = true
            exec(config.get('before_tests'), function(err, stdout, stderr){
                self.disableFileWatch = false
                if (callback) callback(err, stdout, stderr)
            })
        }else{
            if (callback) callback()
        }
    }
    , removeBrowser: function(browser){
        this.runners.remove(browser)
    }
    , connectBrowser: function(browserName, client){
        var existing = this.runners.find(function(runner){
            return runner.pending && runner.get('name') === browserName
        })
        if (existing){
            clearTimeout(existing.pending)
            existing.set('socket', client)
        }else{
            var browser = new BrowserRunner({
                name: browserName
                , socket: client
                , app: this
            })
            this.runners.push(browser)
        }
    }
}

module.exports = BaseApp