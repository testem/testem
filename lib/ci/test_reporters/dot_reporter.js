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
  start: function() {},
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
    this.out.write('.')
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
    this.results.forEach(function(result, idx){
      result = result.result
      var error = result.error
      if (!error) return
      this.out.write('  ' + (idx + 1) + ') ' + result.name + '\n')
      if (error.stack){
        this.out.write('     ' + error.stack)
      }else{
        this.out.write('     ' + error.message + '\n')
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
