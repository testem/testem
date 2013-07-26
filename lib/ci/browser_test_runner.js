function BrowserTestRunner(launcher, reporter){
  this.launcher = launcher
  this.reporter = reporter
}
BrowserTestRunner.prototype = {
  start: function(onFinish){
    this.onFinish = onFinish
    this.launcher.start()
    this.reporter.start()
  },
  tryAttach: function(browser, id, socket){
    this.id = id
    this.browserName = browser
    if (id == this.launcher.id){
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
      passed: !result.failed,
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
