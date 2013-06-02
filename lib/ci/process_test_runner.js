function ProcessTestRunner(launcher, reporter, onFinish){
  this.launcher = launcher
  this.reporter = reporter
  this.onFinish = onFinish
}
ProcessTestRunner.prototype = {
  start: function(){
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