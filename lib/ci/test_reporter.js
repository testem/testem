var strutils = require('../strutils')

function TestReporter(silent){
  this.silent = silent
  this.stoppedOnError = null
  this.id = 1
  this.total = 0
  this.pass = 0
  this.results = []
}
TestReporter.prototype = {
  report: function(prefix, data){
    this.results.push({
      launcher: prefix,
      result: data
    })
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
    var line = (prefix ? (prefix + ' - ') : '') + 
      result.name.trim()
    return (result.passed ? 'ok ' : 'not ok ') +
      (this.id++) + ' ' + line
  },
  summaryDisplay: function(){
    var lines = [
      '1..' + this.total,
      '# tests ' + this.total,
      '# pass  ' + this.pass,
      '# fail  ' + (this.total - this.pass)
    ]
    if (this.pass === this.total){
      lines.push('')
      lines.push('# ok')
    }
    return lines.join('\n')
  },
  display: function(prefix, result){
    if (this.silent) return
    console.log(this.resultDisplay(prefix, result))
    if (result.error){
      console.log(this.errorDisplay(result.error))
    }
  },
  displayError: function(err){
    if (this.silent) return
    console.log('1 not ok "' + err.message.trim() + '"')
  },
  finish: function(){
    if (this.silent) return
    console.log()
    console.log(this.summaryDisplay())
  }
}

module.exports = TestReporter