function ProcessTestRunner(launcher, reporter){
  this.launcher = launcher
  this.reporter = reporter
}
ProcessTestRunner.prototype = {
  start: function(onFinish){
    this.onFinish = onFinish
    this.launcher.start()
    this.launcher.once('processExit', this.onProcessExit.bind(this))
  },
  onProcessExit: function(code, stdout, stderr){
    var result = {
      passed: code === 0,
      name: this.launcher.commandLine()
    }
    if (!result.passed){
      result.error = {
        stdout: stdout,
        stderr: stderr
      }
    }
    this.reporter.report(this.launcher.name, result)
    this.onFinish()
  }
}

module.exports = ProcessTestRunner