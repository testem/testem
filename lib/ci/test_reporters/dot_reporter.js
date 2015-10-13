var strutils = require('../../strutils')

function DotReporter(silent, out){
  this.out = out || process.stdout
  this.silent = silent
  this.stoppedOnError = null
  this.id = 1
  this.total = 0
  this.pass = 0
  this.results = []
  this.startTime = new Date()
  this.endTime = null
  this.out.write('\n')
  this.out.write('  ')
}
DotReporter.prototype = {
  report: function(prefix, data){
    this.results.push({
      launcher: prefix,
      result: data
    })
    this.display(prefix, data)
    this.total++
    if (data.passed) this.pass++
  },

  display: function(prefix, result){
    if (this.silent) return
    if (result.passed) {
      this.out.write('.')
    } else {
      this.out.write('F')
    }
  },
  finish: function(){
    if (this.silent) return
    this.endTime = new Date()
    this.out.write('\n\n')
    this.out.write(this.summaryDisplay())
    this.out.write('\n\n')
    this.displayErrors()
  },
  displayErrors: function(){
    this.results.forEach(function(data, idx){
      var result = data.result
      var error = result.error
      if (!error) return
      this.out.write('  ' + (idx + 1) + ') [' + data.launcher + '] ' + result.name + '\n')
      if (error.message) {
        this.out.write('     message: >\n' +
                       '       ' + error.message + '\n')
      }
      if ('expected' in error && 'actual' in error) {
        this.out.write('     expected: >\n' +
                       '       ' + error.expected + '\n')
        this.out.write('     actual: >\n' +
                       '       ' + error.actual + '\n')
      }
    }, this)
  },
  summaryDisplay: function(){
    return '  ' + this.total + ' tests complete (' + this.duration() + ' ms)'
  },
  duration: function(){
    return Math.round((this.endTime - this.startTime))
  }
}



module.exports = DotReporter
