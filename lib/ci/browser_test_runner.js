function BrowserTestRunner(launcher, reporter){
  this.launcher = launcher
  this.reporter = reporter
  this.finished = false
}
BrowserTestRunner.prototype = {
  start: function(onFinish){
    this.onFinish = onFinish
    var launcher = this.launcher
    this.launcher.on('processExit', this.onProcessExit.bind(this))
    launcher.start()
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
    var self = this
    this.launcher.kill(null, function(){
      self.finish()
    })
  },
  onProcessExit: function(code){
    var self = this

    setTimeout(function(){
      if (self.finished) return
      var result = {
        passed: false,
        name: "Browser " + self.launcher.commandLine() + ' exited unexpectedly.'
      }
      self.reporter.report(self.launcher.name, result)
      self.finish()
    }, 1000)
  },
  finish: function(){
    this.finished = true
    if (this.onFinish){
      this.onFinish()
    }
  }
}

module.exports = BrowserTestRunner