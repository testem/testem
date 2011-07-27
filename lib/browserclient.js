function BrowserClient(client, app){
    this.client = client
    this.app = app
    this.server = this.app.server
    with(this.client){
        on('browser-login', this.onBrowserLogin.bind(this))
        on('tests-start', this.onTestsStart.bind(this))
        on('test-result', this.onTestResult.bind(this))
        on('all-test-results', this.onAllTestResults.bind(this))
    }
}

BrowserClient.prototype = {
    onBrowserLogin: function(browserName){
        this.app.log.info('browser login: ' + browserName)
        this.server.cleanUpConnections()
        this.testsCompleted = 0
        this.name = browserName
        this.server.notify('browsers-changed')
    },
    onTestsStart: function(){
        this.server.notify('test-start')
    },
    onTestResult: function(result){
        this.testsCompleted++
        this.server.notify('test-result')
    },
    onAllTestResults: function(results){
        this.results = results
        this.app.log.info(JSON.stringify(results))
        this.server.notify('all-test-results')
    }
}

module.exports = BrowserClient