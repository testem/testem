function BrowserTestRunner(launcher, reporter, server, onFinish){
  this.launcher = launcher
  this.server = server
  this.onFinish = onFinish
  this.reporter = reporter
}
BrowserTestRunner.prototype = {
  start: function(){
    var launcher = this.launcher
    launcher.start()
    this.server.on('browser-login', this.onBrowserLogin.bind(this))
  },
  onBrowserLogin: function(browser, socket){
    this.browserName = browser
    if (this.browserMatches(browser)){
      socket.on('test-result', this.onTestResult.bind(this))
      socket.once('all-test-results', this.onAllTestResults.bind(this))
    }
  },
  browserMatches: function(browser){
    return -1 !== browser.toLowerCase().indexOf(this.launcher.name.toLowerCase())
  },
  onTestResult: function(result){
    var errItems = (result.items || [])
      .filter(function(item){
        return !item.passed
      })
    this.reporter.report(this.browserName, {
      passed: result.passed,
      name: result.name,
      error: errItems[0]
    })
  },
  onAllTestResults: function(results){
    var onFinish = this.onFinish
    this.launcher.kill(null, function(){
      onFinish()
    })
  }
}

module.exports = BrowserTestRunner