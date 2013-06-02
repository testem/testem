var tap = require('tap')
function TapProcessTestRunner(launcher, reporter, onFinish){
  this.launcher = launcher
  this.onFinish = onFinish
  this.tapConsumer = new tap.Consumer()
  this.reporter = reporter
}
TapProcessTestRunner.prototype = {
  start: function(){
    this.launcher.start()
    this.launcher.process.stdout.pipe(this.tapConsumer)
    this.tapConsumer.on('data', this.onData.bind(this))
    this.tapConsumer.on('end', this.onEnd.bind(this))
    this.tapConsumer.on('bailout', this.onBailout.bind(this))
  },
  onData: function(data){
    if (typeof data === 'object'){
      this.reporter.report(this.launcher.name, {
        passed: data.ok,
        name: data.name.trim(),
        error: data.expected ? {
          operator: data.operator,
          expected: data.expected,
          actual: data.actual
        } : null
      })
    }
  },
  onEnd: function(err, count){
    this.wrapUp()
  },
  onBailout: function(){
    this.wrapUp()
  },
  wrapUp: function(){
    this.launcher.kill(null, function(){
      this.onFinish()
    }.bind(this))
  }
}

module.exports = TapProcessTestRunner