var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var BrowserRunner = require('./runners').BrowserRunner
var exec = require('child_process').exec
var log = require('winston')
var template = require('./strutils').template
var async = require('async')
var _ = require('underscore')

function BaseApp(config){
    var self = this
    this.config = config
    this.port = this.config.get('port')
    this.url = 'http://localhost:' + this.port
    this.runners = new Backbone.Collection
    this.templateParameters = {
        url: this.url,
        port: this.port
    }

    this
        .on('all-test-results', function () {
            var allRunnersComplete = self.runners.all(function (runner) {
                var results = runner.get('results')
                return results && !!results.get('all')
            })
            if (allRunnersComplete) {
                self.emit('all-runners-complete')
            }
        })
}
BaseApp.prototype = {
    __proto__: EventEmitter.prototype
    , runPreprocessors: function(callback){
        this.runHook('before_tests', callback)
    }
    , runPostprocessors: function(callback){
        this.runHook('after_tests', callback)
    }
    , template: function(str) {
        return template(str, this.templateParameters)
    }
    , startOnStartHook: function(callback){
        var on_start = this.config.get('on_start')
        if (on_start){
            this.onStartProcess = []
            var hooks = _.isArray(on_start) ? on_start : [on_start]
            var self = this
            var doHook = function(i){
                if( i == hooks.length){
                    if (callback) callback()
                } else {
                    var on_start = hooks[i]
                    var cmd = on_start.command ? self.template(on_start.command) : self.template(on_start)
                    var waitForText = on_start.wait_for_text
                    log.info('Starting on_start hook: ' + cmd, + self)
                    self.onStartProcess[i] = exec(cmd)
                    self.onStartProcess[i].stdout.on('data', function(data){
                        var text = '' + data
                        if (text && text.indexOf(waitForText) !== -1){
                            doHook(i + 1)
                        }
                    })
                    if (!waitForText){
                        doHook(i + 1)
                    }
                }
            }
            doHook(0)
        }else{
            if (callback) callback()
        }
    }
    , runExitHook: function (callback) {
        if(this.onStartProcess) {
            for(var i = this.onStartProcess.length - 1; i >=0; i--){
                this.onStartProcess[i].kill('SIGTERM');
            }
        }
        this.runHook('on_exit', callback)
    }
    , runHook: function(hook, callback){
        var self = this
        var hookCommands = this.config.get(hook)
        if (hookCommands){
            hookCommands = _.isArray(hookCommands) ? hookCommands : [hookCommands]
            var doHook = function(i, priorErr, priorStdOut, priorStdErr, priorHookCommand){
                if(i == hookCommands.length || priorErr){
                    if (callback) callback(priorErr, priorStdOut, priorStdErr, priorHookCommand)
                } else {
                    hookCommand = self.template(hookCommands[i])
                    log.info('Running ' + hook + ' command ' + hookCommand)
                    self.disableFileWatch = true
                    exec(hookCommand, function(err, stdout, stderr){
                        self.disableFileWatch = false
                        doHook(i + 1, err,  priorStdOut + stdout, priorStdErr + stderr, hookCommand)
                    })
                }
            }
            doHook(0, null, '', '', null)
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
    , cleanUpLaunchers: function(callback){
        if (!this.launchers){
            if (callback) callback()
            return
        }
        async.forEach(this.launchers, function(launcher, done){
            if (launcher && launcher.process){
                launcher.kill('SIGTERM', done)
            }else{
                done()
            }
        }, callback)
    }
}

module.exports = BaseApp
