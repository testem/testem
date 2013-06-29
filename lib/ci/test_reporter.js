var strutils = require('../strutils')

function TestReporter(){
  this.id = 1
  this.total = 0
  this.pass = 0
}
TestReporter.prototype = {
  report: function(prefix, data){
    this.display(prefix, data)
    this.total++
    if (data.passed) this.pass++
  },
  errorDisplay: function(err){
    var inside = Object.keys(err)
      .filter(function(key){
        return key !== 'passed'
      })
      .map(function(key){
        return key + ': ' + err[key]
      })
    return strutils.indent([
      '---',
      strutils.indent(inside.join('\n')),
      '...'].join('\n'))
  },
  resultDisplay: function(prefix, result){
    return (result.passed ? 'ok ' : 'not ok ') +
      (this.id++) + ' ' + prefix + ' - ' + result.name.trim()
  },
  summaryDisplay: function(){
    return [
      '1..' + this.total,
      '# tests ' + this.total,
      '# pass  ' + this.pass,
      '# fail  ' + (this.total - this.pass)
    ].join('\n')
  },
  display: function(prefix, result){
    if (result.error){
      console.log(this.resultDisplay(prefix, result))
      console.log(this.errorDisplay(result.error))
    }
  },
  finish: function(){
    console.log()
    console.log(this.summaryDisplay())
  }
}

module.exports = TestReporter
