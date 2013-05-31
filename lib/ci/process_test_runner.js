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
    var passed = code === 0
    this.reporter.report(this.launcher.name, {
      passed: passed,
      name: this.launcher.commandLine(),
      error: {
        stdout: stdout,
        stderr: stderr
      }
    })
    this.onFinish()
  }
}

module.exports = ProcessTestRunner