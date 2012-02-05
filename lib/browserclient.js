var log = require('winston')

function BrowserClient(client, app){
    this.client = client
    this.app = app
    this.server = this.app.server
    this.resetTestResults()
    this.name = null
    with(this.client){
        on('error', this.onTopLevelError.bind(this))
        on('browser-login', this.onBrowserLogin.bind(this))
        on('tests-start', this.onTestsStart.bind(this))
        on('test-result', this.onTestResult.bind(this))
        on('all-test-results', this.onAllTestResults.bind(this))
        on('disconnect', this.onDisconnect.bind(this))
    }
}

BrowserClient.prototype = {
    resetTestResults: function(){
        this.topLevelError = null
        this.results = {
            failed: 0,
            passed: 0,
            total: 0,
            tests: []
        }
    },
    startTests: function(){
        this.resetTestResults()
        this.client.emit('start-tests')
    },
    onTopLevelError: function(msg, url, line){
        log.info('top-level error from browser')
        this.topLevelError = msg + ' at ' + url + ', line ' + line
        this.server.notify('browsers-changed')
    },
    onBrowserLogin: function(browserName){
        log.info('browser login: ' + browserName)
        this.name = browserName
        this.server.cleanUpConnections()
        this.server.notify('browsers-changed')
    },
    onTestsStart: function(){
        this.server.notify('test-start')
    },
    onTestResult: function(result){
        this.results.total++
        if (result.failed == 0)
            this.results.passed++
        else
            this.results.failed++
        this.results.tests.push(result)
        this.server.notify('test-result', result, this)
    },
    onAllTestResults: function(){
        this.results.all = true
        this.server.notify('all-test-results', this.results, this)
    },
    onDisconnect: function(){
        log.info(this.name + ' disconnected')
        this.server.removeBrowser(this)
    }
}

module.exports = BrowserClient